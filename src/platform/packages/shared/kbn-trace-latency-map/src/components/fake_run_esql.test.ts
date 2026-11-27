/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LATENCY_MAP_ROWS } from '../query/duration_rows';
import { operationToEsqlCondition } from '../operations/to_esql';
import { bimodal, bimodalSlow, createFakeRunEsql } from './__fixtures__/fake_run_esql';
import type { FakeOperation } from './__fixtures__/fake_run_esql';

// The runner answers by the same markers the real queries carry.
const STATS_QUERY = 'FROM fake | STATS min = MIN(d), p99 = PERCENTILE(d, 99)';
// 90s bins over the hour the fake covers: 40 columns.
const GRID_QUERY =
  'FROM fake | EVAL xi = TO_INTEGER((TO_LONG(@timestamp) - 1000) / 90000) | STATS BY xi, yi';
const OPERATIONS_QUERY = 'FROM fake | STATS BY service.name, operation, yi';

const run = (options: Partial<Parameters<typeof createFakeRunEsql>[0]> = {}) =>
  createFakeRunEsql({ pattern: bimodal, delayMs: 0, ...options });

describe('createFakeRunEsql', () => {
  it('answers the statistics query with the fixed statistics and the configured span count', async () => {
    const { columns, values } = await run({ spans: 123 })(STATS_QUERY);
    expect(columns.map(({ name }) => name)).toEqual(['min', 'p90', 'p95', 'p99', 'max', 'spans']);
    expect(values[0][values[0].length - 1]).toBe(123);
  });

  it('answers the grid query with the bins of the parsed width, the same on every run', async () => {
    const runEsql = run();
    const { columns, values } = await runEsql(GRID_QUERY);
    expect(columns.map(({ name }) => name)).toEqual(['xi', 'yi', 'spans', 'failed']);
    const xis = values.map(([xi]) => Number(xi));
    expect(Math.max(...xis)).toBeLessThan(40);
    for (const [, yi, spans, failed] of values as number[][]) {
      expect(yi).toBeLessThan(LATENCY_MAP_ROWS);
      // Empty groups return no row, and a cell never fails more than it has spans.
      expect(spans).toBeGreaterThan(0);
      expect(failed).toBeLessThanOrEqual(spans);
    }
    // Deterministic noise: a reload tells the same story.
    expect((await runEsql(GRID_QUERY)).values).toEqual(values);
  });

  it('scales the counts of a sampled query down by the sampled share', async () => {
    const runEsql = run();
    const total = (values: unknown[][]) =>
      values.reduce((sum: number, [, , spans]) => sum + Number(spans), 0);
    const full = total((await runEsql(GRID_QUERY)).values);
    const sampled = total((await runEsql(`${GRID_QUERY} | SAMPLE 0.5`)).values);
    // Rounded per cell, so near half, not exactly.
    expect(sampled).toBeGreaterThan(full * 0.4);
    expect(sampled).toBeLessThan(full * 0.6);
  });

  it('answers the operation histogram per operation, and a focus clause narrows every answer', async () => {
    const fast: FakeOperation = { service: 'cart', name: 'GET /a', pattern: bimodal };
    const slow: FakeOperation = { service: 'cart', name: 'GET /b', pattern: bimodalSlow };
    const runEsql = run({ operations: [fast, slow] });

    const unfocused = await runEsql(OPERATIONS_QUERY);
    expect(new Set(unfocused.values.map(([, name]) => name))).toEqual(
      new Set(['GET /a', 'GET /b'])
    );

    // Discover keeps the focused operation as a WHERE clause of the query it hands back.
    const focused = await runEsql(`${OPERATIONS_QUERY} ${operationToEsqlCondition(slow)}`);
    expect(new Set(focused.values.map(([, name]) => name))).toEqual(new Set(['GET /b']));

    const grid = await runEsql(GRID_QUERY);
    const focusedGrid = await runEsql(`${GRID_QUERY} ${operationToEsqlCondition(slow)}`);
    expect(focusedGrid.values).not.toEqual(grid.values);
  });

  it('fails the way a bad index does when asked to', async () => {
    await expect(run({ fail: true })(STATS_QUERY)).rejects.toThrow('verification_exception');
  });
});
