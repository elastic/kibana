/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildFocusedViewRawQuery,
  buildFocusedViewTimeRange,
} from './build_change_point_tab_queries';

describe('buildFocusedViewRawQuery', () => {
  const lineEsql =
    'FROM zookeeper-service | STATS avg_bytes=AVG(event.duration) BY agent.hostname.keyword, cloud.service.name.keyword, day=BUCKET(@timestamp, 1d)';

  it('returns only the FROM clause when entityValues is empty', () => {
    const result = buildFocusedViewRawQuery(lineEsql, {});
    expect(result).toBe('FROM zookeeper-service');
  });

  it('appends a WHERE clause for a single entity value', () => {
    const result = buildFocusedViewRawQuery(lineEsql, { 'agent.hostname.keyword': 'web-01' });
    expect(result).toBe('FROM zookeeper-service | WHERE `agent.hostname.keyword` == "web-01"');
  });

  it('appends AND-joined predicates for multiple entity values', () => {
    const result = buildFocusedViewRawQuery(lineEsql, {
      'agent.hostname.keyword': 'director-us-central1',
      'cloud.service.name.keyword': 'GCE',
    });
    expect(result).toBe(
      'FROM zookeeper-service | WHERE `agent.hostname.keyword` == "director-us-central1" AND `cloud.service.name.keyword` == "GCE"'
    );
  });

  it('backtick-quotes identifiers that contain dots or special characters', () => {
    const result = buildFocusedViewRawQuery(lineEsql, { 'agent.hostname.keyword': 'host-1' });
    expect(result).toContain('`agent.hostname.keyword`');
  });

  it('double-quotes string values in the predicate', () => {
    const result = buildFocusedViewRawQuery(lineEsql, { host: 'my-server' });
    expect(result).toContain('"my-server"');
  });

  it('escapes double-quote characters inside string values', () => {
    const result = buildFocusedViewRawQuery(lineEsql, { host: 'with"quote' });
    expect(result).toContain('"with\\"quote"');
  });

  it('returns undefined when the query has no FROM clause', () => {
    const result = buildFocusedViewRawQuery('NOT A VALID ESQL QUERY', { host: 'web-01' });
    expect(result).toBeUndefined();
  });

  it('handles multiline / pretty-printed queries with leading whitespace', () => {
    const multilineEsql =
      '\n  FROM zookeeper-service\n  | STATS avg_bytes=AVG(event.duration) BY day=BUCKET(@timestamp, 1d)';
    const result = buildFocusedViewRawQuery(multilineEsql, {});
    expect(result).toBe('FROM zookeeper-service');
  });

  it('handles multiple indices (AST normalises comma spacing)', () => {
    const multiIndexEsql =
      'FROM foo-1, foo-2 | STATS avg_bytes=AVG(event.duration) BY day=BUCKET(@timestamp, 1d)';
    const result = buildFocusedViewRawQuery(multiIndexEsql, { host: 'web-01' });
    // AST strips whitespace around commas; both indices are preserved.
    expect(result).toBe('FROM foo-1,foo-2 | WHERE host == "web-01"');
  });
});

// Pin "now" so that datemath expressions like "now-30d" resolve to known values.
const FIXED_NOW = new Date('2024-02-01T00:00:00.000Z').getTime();

describe('buildFocusedViewTimeRange', () => {
  const from = '2024-01-01T00:00:00.000Z';
  const to = '2024-02-01T00:00:00.000Z';
  // 31-day range → 3% padding = ~0.93 days
  const totalMs = new Date(to).getTime() - new Date(from).getTime();
  const padding = totalMs * 0.03;

  describe('absolute time ranges', () => {
    it('centres the window on a single annotation', () => {
      const annotationDatetime = '2024-01-16T00:00:00.000Z';
      const cpMs = new Date(annotationDatetime).getTime();

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from, to }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(cpMs - padding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(cpMs + padding, -3);
    });

    it('spans all annotations when multiple change points exist', () => {
      // Use a wide 3-month range and centrally-placed annotations so the padding
      // does not reach either bound and no clamping occurs.
      const wideFrom = '2024-01-01T00:00:00.000Z';
      const wideTo = '2024-04-01T00:00:00.000Z';
      const wideTotalMs = new Date(wideTo).getTime() - new Date(wideFrom).getTime();
      const widePadding = wideTotalMs * 0.03;

      const first = '2024-01-25T00:00:00.000Z';
      const last = '2024-02-25T00:00:00.000Z';
      const firstMs = new Date(first).getTime();
      const lastMs = new Date(last).getTime();

      const result = buildFocusedViewTimeRange(
        [
          { name: 'step_change (p=0.001)', datetime: first },
          { name: 'trend_change (p=0.002)', datetime: last },
        ],
        { from: wideFrom, to: wideTo }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(firstMs - widePadding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(lastMs + widePadding, -3);
    });

    it('clamps the window lower bound to the original range start', () => {
      // Annotation very close to `from` — focus window would go before start.
      const annotationDatetime = '2024-01-02T00:00:00.000Z';

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from, to }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeGreaterThanOrEqual(new Date(from).getTime());
    });

    it('clamps the window upper bound to the original range end', () => {
      const annotationDatetime = '2024-01-31T00:00:00.000Z';

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from, to }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.to).getTime()).toBeLessThanOrEqual(new Date(to).getTime());
    });
  });

  describe('relative time ranges', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: FIXED_NOW });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('resolves relative bounds via datemath and applies 3% padding', () => {
      // now=2024-02-01, now-30d=2024-01-02 → 30-day range, 3% padding ≈ 21.6h
      const resolvedFromMs = new Date('2024-01-02T00:00:00.000Z').getTime();
      const resolvedToMs = FIXED_NOW;
      const relativePadding = (resolvedToMs - resolvedFromMs) * 0.03;

      const annotationDatetime = '2024-01-16T00:00:00.000Z';
      const cpMs = new Date(annotationDatetime).getTime();

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from: 'now-30d', to: 'now' }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(cpMs - relativePadding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(cpMs + relativePadding, -3);
    });

    it('spans multiple annotations for a relative range', () => {
      const resolvedFromMs = new Date('2024-01-02T00:00:00.000Z').getTime();
      const resolvedToMs = FIXED_NOW;
      const relativePadding = (resolvedToMs - resolvedFromMs) * 0.03;

      const first = '2024-01-10T00:00:00.000Z';
      const last = '2024-01-25T00:00:00.000Z';
      const firstMs = new Date(first).getTime();
      const lastMs = new Date(last).getTime();

      const result = buildFocusedViewTimeRange(
        [
          { name: 'step_change (p=0.001)', datetime: first },
          { name: 'trend_change (p=0.002)', datetime: last },
        ],
        { from: 'now-30d', to: 'now' }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(firstMs - relativePadding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(lastMs + relativePadding, -3);
    });
  });

  describe('unresolvable time ranges (template variables)', () => {
    it('returns undefined when bounds cannot be parsed', () => {
      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: '2024-01-16T00:00:00.000Z' }],
        { from: '$timeFrom', to: '$timeTo' }
      );

      expect(result).toBeUndefined();
    });
  });
});
