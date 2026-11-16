/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getReplayCacheContextKey } from './get_replay_cache_context_key';

const context = { timeRange: { from: 'now-1h', to: 'now' }, pinnedFilters: [] };

describe('getReplayCacheContextKey', () => {
  test('keeps the time selection relative instead of resolving now', () => {
    expect(JSON.parse(getReplayCacheContextKey(context))).toMatchObject({
      timeRange: context.timeRange,
    });
  });

  test.each([
    {
      change: 'the start of the time selection',
      changes: { timeRange: { from: 'now-24h', to: 'now' } },
    },
    {
      change: 'the end of the time selection',
      changes: { timeRange: { from: 'now-1h', to: 'now-5m' } },
    },
    {
      change: 'the pinned filters',
      changes: { pinnedFilters: [{ meta: {}, query: { match_all: {} } }] },
    },
    { change: 'the project routing', changes: { projectRouting: '_alias:_origin' } },
  ])('changes with $change', ({ changes }) => {
    expect(getReplayCacheContextKey({ ...context, ...changes })).not.toBe(
      getReplayCacheContextKey(context)
    );
  });
});
