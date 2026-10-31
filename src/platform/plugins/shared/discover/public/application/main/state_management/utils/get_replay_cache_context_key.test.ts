/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceType } from '../../../../../common/data_sources';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import type { TabState } from '../redux/types';
import { getReplayCacheContextKey } from './get_replay_cache_context_key';

const tab = getTabStateMock({ id: 'tab' });
const timeRange = { from: 'now-1h', to: 'now' };

describe('getReplayCacheContextKey', () => {
  test.each<[string, Partial<TabState>]>([
    ['query', { appState: { query: { language: 'kuery', query: 'status: 500' } } }],
    ['app filters', { appState: { filters: [{ meta: {}, query: { match_all: {} } }] } }],
    [
      'data view',
      { appState: { dataSource: { type: DataSourceType.DataView, dataViewId: 'other' } } },
    ],
    ['Fast Mode', { appState: { esqlApproximation: true } }],
    ['variables', { esqlVariables: [{ key: 'extension', type: 'values', value: 'jpg' }] }],
  ])('stays the same when %s changes', (_name, changes) => {
    expect(getReplayCacheContextKey({ ...tab, ...changes }, timeRange)).toBe(
      getReplayCacheContextKey(tab, timeRange)
    );
  });

  test('ignores display settings', () => {
    const displayChangedTab = getTabStateMock({
      id: tab.id,
      label: 'renamed',
      appState: {
        columns: ['message'],
        sort: [['@timestamp', 'asc']],
        sampleSize: 100,
        breakdownField: 'extension',
        interval: 'h',
      },
    });

    expect(getReplayCacheContextKey(displayChangedTab, timeRange)).toBe(
      getReplayCacheContextKey(tab, timeRange)
    );
  });

  test('preserves relative time values instead of resolving now', () => {
    expect(JSON.parse(getReplayCacheContextKey(tab, timeRange))).toMatchObject({ timeRange });
  });

  test('changes when the start of the time selection changes', () => {
    expect(getReplayCacheContextKey(tab, { from: 'now-24h', to: 'now' })).not.toBe(
      getReplayCacheContextKey(tab, timeRange)
    );
  });

  test('changes when the end of the time selection changes', () => {
    expect(getReplayCacheContextKey(tab, { from: 'now-1h', to: 'now-5m' })).not.toBe(
      getReplayCacheContextKey(tab, timeRange)
    );
  });

  test('changes when pinned filters change', () => {
    const pinnedFiltersTab = getTabStateMock({
      id: tab.id,
      globalState: { filters: [{ meta: {}, query: { match_all: {} } }] },
    });

    expect(getReplayCacheContextKey(pinnedFiltersTab, timeRange)).not.toBe(
      getReplayCacheContextKey(tab, timeRange)
    );
  });

  test('changes when the project routing changes', () => {
    expect(getReplayCacheContextKey(tab, timeRange, '_alias:_origin')).not.toBe(
      getReplayCacheContextKey(tab, timeRange)
    );
  });
});
