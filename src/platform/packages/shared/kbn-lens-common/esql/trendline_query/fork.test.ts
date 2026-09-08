/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { queryHasStatsCommand } from './trendline_query';

// FORK rewrite shapes are covered by the shared case matrix from
// @kbn/lens-test-helpers (see trendline_query_cases.test.ts); this file keeps
// FORK-aware detection behaviors the matrix does not exercise.
describe('queryHasStatsCommand', () => {
  it('returns true for a top-level STATS command', () => {
    expect(queryHasStatsCommand('FROM index | STATS COUNT(*)')).toBe(true);
  });

  it('returns false when the query has no STATS', () => {
    expect(queryHasStatsCommand('FROM index | KEEP bytes')).toBe(false);
  });

  it('returns true for STATS nested inside a FORK branch', () => {
    expect(
      queryHasStatsCommand('FROM index | FORK (WHERE bytes > 0) (STATS total = SUM(bytes))')
    ).toBe(true);
  });

  it('returns false for FORK without any STATS branch', () => {
    expect(queryHasStatsCommand('FROM index | FORK (WHERE bytes > 0) (LIMIT 5)')).toBe(false);
  });
});
