/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  MAP_SPAN_BUDGET,
  buildDurationStatsQuery,
  buildLatencyGridQuery,
  getMapQueryParts,
  getMapSampling,
  getMapSource,
} from './latency_map_query';
import { getTimeGrid } from './time_grid';
import type { DurationStats, TraceSource } from '../types';

const source: TraceSource = {
  timeRange: { from: '2026-10-26T10:00:00.000Z', to: '2026-10-26T11:00:00.000Z' },
  filters: ['service.name == "checkout" OR service.name == "cart"'],
};
const stats: DurationStats = {
  min: 100,
  p90: 5000,
  p95: 8000,
  p99: 10_000,
  max: 2_000_000,
  spans: 1000,
};

describe('latency map queries', () => {
  it('reads every trace index, nullifies unmapped fields and brackets the host filters', () => {
    const query = buildDurationStatsQuery(source);
    expect(query).toContain('SET unmapped_fields = "NULLIFY";');
    expect(query).toContain('FROM traces-apm*, apm-*, traces-*.otel-*');
    expect(query).toContain('@timestamp >= TO_DATETIME("2026-10-26T10:00:00.000Z")');
    // The brackets keep the OR from escaping the time range.
    expect(query).toContain('(service.name == "checkout" OR service.name == "cart")');
    expect(query).toContain('PERCENTILE(duration_us, 99)');
  });

  it('bins time and duration in Elasticsearch', () => {
    const timeGrid = getTimeGrid(source.timeRange.from, source.timeRange.to, 60);
    expect(timeGrid).toEqual({
      fromMs: Date.parse(source.timeRange.from),
      binMs: 60_000,
      bins: 60,
    });
    const query = buildLatencyGridQuery(source, stats, timeGrid);
    expect(query).toContain(`TO_LONG(@timestamp) - ${timeGrid.fromMs}`);
    expect(query).toContain('STATS spans = COUNT(*), failed = COUNT(*) WHERE is_failed BY xi, yi');
    expect(query).toContain('LIMIT 10000');
  });

  it('adds the root span, scoping and map-only conditions to the source', () => {
    expect(
      getMapSource(source, { unit: 'traces', selectionCondition: 'a == 1', mapFilters: ['b == 2'] })
        .filters
    ).toEqual([
      'service.name == "checkout" OR service.name == "cart"',
      'parent.id IS NULL AND parent_span_id IS NULL',
      'a == 1',
      'b == 2',
    ]);
    expect(getMapSource(source, {})).toBe(source);
  });

  describe('sampling', () => {
    it('reads a range inside the budget exactly', () => {
      expect(getMapSampling({ ...stats, spans: MAP_SPAN_BUDGET })).toBeUndefined();
    });

    it('samples a larger range, keeping failures and the slowest spans exact', () => {
      const sampling = getMapSampling({ ...stats, spans: MAP_SPAN_BUDGET * 4 });
      expect(sampling).toEqual({ probability: 0.25, tailUs: 8000 });

      const [exact, sampled] = getMapQueryParts(sampling!);
      expect(exact.probability).toBeUndefined();
      expect(exact.condition).toContain('event.outcome == "failure"');
      expect(exact.condition).toContain('transaction.duration.us >= 8000');
      expect(exact.condition).toContain('duration >= 8000000');
      expect(sampled.probability).toBe(0.25);
      // Null-safe, so a span missing a field is in one part and not in neither.
      expect(sampled.condition).toContain('(event.outcome IS NULL OR event.outcome != "failure")');
      expect(sampled.condition).toContain('(span.duration.us IS NULL OR span.duration.us < 8000)');
    });

    it('puts SAMPLE right after the conditions, before any computed column', () => {
      const timeGrid = getTimeGrid(source.timeRange.from, source.timeRange.to, 60);
      const [, sampled] = getMapQueryParts({ probability: 0.25, tailUs: 8000 });
      const query = buildLatencyGridQuery(source, stats, timeGrid, sampled);
      expect(query.indexOf('SAMPLE 0.25')).toBeGreaterThan(query.indexOf('WHERE'));
      expect(query.indexOf('SAMPLE 0.25')).toBeLessThan(query.indexOf('EVAL otel_duration_us'));
    });
  });
});
