/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { getReplayCacheContextKey } from './get_replay_cache_context_key';

const context = {
  timeRange: { from: 'now-15m', to: 'now' },
  pinnedFilters: [] as Filter[],
  projectRouting: '_alias:_origin',
};

describe('getReplayCacheContextKey', () => {
  test('compares relative selections without resolving now and ignores property order', () => {
    expect(getReplayCacheContextKey(context)).toBe(
      getReplayCacheContextKey({ ...context, timeRange: { to: 'now', from: 'now-15m' } })
    );
    expect(JSON.parse(getReplayCacheContextKey(context))).toEqual(context);
  });

  test.each([
    { timeRange: { from: 'now-30m', to: 'now' } },
    { timeRange: { from: 'now-15m', to: 'now-5m' } },
    { pinnedFilters: [{ meta: {}, query: { match_all: {} } }] },
    { projectRouting: '_alias:*' },
  ])('changes when the external context changes: %j', (change) => {
    expect(getReplayCacheContextKey({ ...context, ...change })).not.toBe(
      getReplayCacheContextKey(context)
    );
  });
});
