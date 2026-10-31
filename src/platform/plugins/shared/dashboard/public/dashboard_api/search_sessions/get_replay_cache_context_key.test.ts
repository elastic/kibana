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

const timeRange = { from: 'now-1h', to: 'now' };
const pinnedFilter: Filter = { meta: {}, query: { match_all: {} } };
const context = { timeRange, pinnedFilters: [] };

describe('getReplayCacheContextKey', () => {
  test('preserves relative time values instead of resolving now', () => {
    expect(JSON.parse(getReplayCacheContextKey(context))).toMatchObject({ timeRange });
  });

  test('changes when the start of the time selection changes', () => {
    expect(
      getReplayCacheContextKey({ ...context, timeRange: { from: 'now-24h', to: 'now' } })
    ).not.toBe(getReplayCacheContextKey(context));
  });

  test('changes when the end of the time selection changes', () => {
    expect(
      getReplayCacheContextKey({ ...context, timeRange: { from: 'now-1h', to: 'now-5m' } })
    ).not.toBe(getReplayCacheContextKey(context));
  });

  test('changes when pinned filters change', () => {
    expect(getReplayCacheContextKey({ ...context, pinnedFilters: [pinnedFilter] })).not.toBe(
      getReplayCacheContextKey(context)
    );
  });

  test('changes when the project routing changes', () => {
    expect(getReplayCacheContextKey({ ...context, projectRouting: '_alias:_origin' })).not.toBe(
      getReplayCacheContextKey(context)
    );
  });
});
