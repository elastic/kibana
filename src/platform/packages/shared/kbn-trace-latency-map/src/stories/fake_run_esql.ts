/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlTable, RunEsql } from '../types';
import { LATENCY_MAP_ROWS } from '../query/duration_rows';

const STATS = { min: 120, p90: 6000, p95: 11_000, p99: 20_000, max: 3_000_000 };

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

/**
 * A runner that answers the map's queries from a pattern, without Elasticsearch: the statistics
 * query with the statistics above, the grid queries with the pattern.
 */
export function createFakeRunEsql({
  pattern,
  spans = 5000,
  delayMs = 400,
  fail = false,
}: {
  pattern: Pattern;
  /** Spans in the range the statistics report. Above 500,000 the map samples. */
  spans?: number;
  delayMs?: number;
  fail?: boolean;
}): RunEsql {
  return async (query) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (fail) throw new Error('verification_exception: Unknown index [traces-apm*]');
    if (query.includes('PERCENTILE')) {
      return {
        columns: [...Object.keys(STATS), 'spans'].map((name) => ({ name })),
        values: [[...Object.values(STATS), spans]],
      } as EsqlTable;
    }
    const binMs = Number(/TO_LONG\(@timestamp\) - \d+\) \/ (\d+)/.exec(query)?.[1] ?? 60_000);
    const bins = Math.ceil(3_600_000 / binMs);
    // The sampled part of a large range reads a share of the spans: scale the pattern down.
    const share = query.includes('SAMPLE') ? Number(/SAMPLE ([\d.]+)/.exec(query)![1]) : 1;
    const random = createRandom(7);
    const values: number[][] = [];
    for (let xi = 0; xi < bins; xi++) {
      for (let yi = 0; yi < LATENCY_MAP_ROWS; yi++) {
        const cell = pattern(xi / bins, yi, random);
        const cellSpans = Math.round(cell.spans * share);
        if (cellSpans > 0)
          values.push([xi, yi, cellSpans, Math.min(cellSpans, Math.round(cell.failed * share))]);
      }
    }
    return { columns: ['xi', 'yi', 'spans', 'failed'].map((name) => ({ name })), values };
  };
}
