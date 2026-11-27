/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { RunEsql } from '../../types';
import { LATENCY_MAP_ROWS } from '../../query/duration_rows';
import { operationToEsqlCondition } from '../../operations/to_esql';
import type { LatencyMapOperation } from '../../operations/operation_bands';

const STATS = {
  min: 120_000,
  p90: 6_000_000,
  p95: 11_000_000,
  p99: 20_000_000,
  max: 3_000_000_000,
};

/** Cheap deterministic noise (a linear congruential generator), so a story looks the same on every load. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const bump = (row: number, center: number, width: number) =>
  Math.exp(-Math.pow((row - center) / width, 2));

export interface CellCounts {
  spans: number;
  failed: number;
}

/** The counts of one cell: `xi` runs 0 to 1 over the time range, `yi` is the row. */
export type Pattern = (time: number, row: number, random: () => number) => CellCounts;

const noise = (random: () => number, base: number) => Math.round(base * (0.7 + random() * 0.6));

/** Gregg's bimodal case: a fast path and a slow path, the slow one failing more. */
export const bimodal: Pattern = (time, row, random) => ({
  spans: noise(random, 90 * bump(row, 6, 1.6) + 30 * bump(row, 15, 1.4)),
  failed: noise(random, 8 * bump(row, 15, 1.4) + 0.5 * bump(row, 6, 1.6)),
});

/** A mode that moves: latency creeping up over the range. */
export const movingMode: Pattern = (time, row, random) => ({
  spans: noise(random, 100 * bump(row, 4 + time * 12, 1.5)),
  failed: noise(random, time > 0.8 ? 6 * bump(row, 4 + time * 12, 1.5) : 0.2),
});

/** A second bimodal shape at other rows, so mixed-operation stories tell the two apart. */
export const bimodalSlow: Pattern = (time, row, random) => ({
  spans: noise(random, 70 * bump(row, 9, 1.5) + 45 * bump(row, 18, 1.5)),
  failed: noise(random, 5 * bump(row, 18, 1.5)),
});

/** A steady service, then a burst of slow failing requests. */
export const failureBurst: Pattern = (time, row, random) => {
  const burst = time > 0.6 && time < 0.72;
  return {
    spans: noise(random, 80 * bump(row, 7, 1.5) + (burst ? 60 * bump(row, 14, 2) : 0)),
    failed: noise(random, burst ? 45 * bump(row, 14, 2) : 0.4 * bump(row, 7, 1.5)),
  };
};

/** One dense mode and a few slow requests scattered far above it. */
export const sparseOutliers: Pattern = (time, row, random) => ({
  spans:
    row < 12
      ? noise(random, 100 * bump(row, 7, 1.6))
      : random() < 0.025
      ? 1 + Math.floor(random() * 3)
      : 0,
  failed: row >= 12 && random() < 0.01 ? 1 : 0,
});

/** One operation of the fake data, with the pattern of its spans. */
export interface FakeOperation extends LatencyMapOperation {
  pattern: Pattern;
}

/** `0, 1, …, length - 1`, so cells can be walked without mutable counters. */
const range = (length: number) => Array.from({ length }, (_, i) => i);

/**
 * Sums pattern cells into one count (a cell never fails more than it has spans) and scales
 * the sum to the sampled share, failures clamped to the scaled spans as in the real STATS.
 */
const totalCounts = (cells: CellCounts[], share: number): CellCounts => {
  const total = cells.reduce(
    (sum, cell) => ({
      spans: sum.spans + cell.spans,
      failed: sum.failed + Math.min(cell.spans, cell.failed),
    }),
    { spans: 0, failed: 0 }
  );
  const spans = Math.round(total.spans * share);
  return { spans, failed: Math.min(spans, Math.round(total.failed * share)) };
};

/**
 * A runner that answers the map's queries from a pattern, without Elasticsearch: the statistics
 * query with the statistics above, the grid queries with the pattern, and the operation
 * histogram query per operation. A query carrying an operation condition (Discover's focus
 * clause) narrows every answer to that operation, so a story's focus round-trips.
 */
export function createFakeRunEsql({
  pattern,
  operations,
  spans = 5000,
  delayMs = 400,
  fail = false,
}: {
  pattern: Pattern;
  /** The operations of the data; the map is their sum. One synthetic operation by default. */
  operations?: FakeOperation[];
  /** Spans in the range the statistics report. Above 500,000 the map samples. */
  spans?: number;
  delayMs?: number;
  fail?: boolean;
}): RunEsql {
  const allOperations: FakeOperation[] = operations ?? [
    { service: 'fake-service', name: 'GET /fake', pattern },
  ];
  return async (query) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (fail) throw new Error('verification_exception: Unknown index [traces-apm*]');
    // A focus clause in the query narrows the data to the operations it names.
    const scoped = allOperations.filter(
      (operation) =>
        !query.includes('transaction.name ==') ||
        query.includes(operationToEsqlCondition(operation))
    );
    if (query.includes('PERCENTILE')) {
      return {
        columns: [...Object.keys(STATS), 'spans'].map((name) => ({ name, type: 'long' })),
        values: [[...Object.values(STATS), spans]],
      } as ESQLSearchResponse;
    }
    // The sampled part of a large range reads a share of the spans: scale the pattern down.
    // `| SAMPLE 0.004` carries the probability as its one number; the capture is that share.
    const share = query.includes('SAMPLE') ? Number(/SAMPLE ([\d.]+)/.exec(query)![1]) : 1;
    if (query.includes('BY service.name, operation, yi')) {
      const random = createRandom(7);
      // The histogram has no time axis: the pattern is read across the range in fixed steps.
      const steps = range(60);
      const values = scoped.flatMap((operation) =>
        range(LATENCY_MAP_ROWS).flatMap((yi): Array<Array<string | number>> => {
          const row = totalCounts(
            steps.map((step) => operation.pattern(step / steps.length, yi, random)),
            share
          );
          // Elasticsearch returns no row for an empty group, and neither does the fake.
          return row.spans > 0
            ? [[operation.service, operation.name, yi, row.spans, row.failed]]
            : [];
        })
      );
      return {
        columns: [
          { name: 'service.name', type: 'keyword' },
          { name: 'operation', type: 'keyword' },
          ...['yi', 'spans', 'failed'].map((name) => ({ name, type: 'long' })),
        ],
        values,
      } as ESQLSearchResponse;
    }
    // The grid query bins time as `EVAL xi = TO_INTEGER((TO_LONG(@timestamp) - <from>) / <binMs>)`
    // (buildLatencyGridQuery): the divisor is the bin width, which sets the column count here.
    const binMs = Number(/TO_LONG\(@timestamp\) - \d+\) \/ (\d+)/.exec(query)?.[1] ?? 60_000);
    const bins = Math.ceil(3_600_000 / binMs);
    const random = createRandom(7);
    const values = range(bins).flatMap((xi) =>
      range(LATENCY_MAP_ROWS).flatMap((yi): number[][] => {
        const cell = totalCounts(
          scoped.map((operation) => operation.pattern(xi / bins, yi, random)),
          share
        );
        // Elasticsearch returns no row for an empty group, and neither does the fake.
        return cell.spans > 0 ? [[xi, yi, cell.spans, cell.failed]] : [];
      })
    );
    return {
      columns: ['xi', 'yi', 'spans', 'failed'].map((name) => ({ name, type: 'long' })),
      values,
    };
  };
}
