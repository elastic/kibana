/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import type { DiscoverAppState } from '../redux';
import { isEqualState } from './state_comparators';

describe('isEqualState', () => {
  const initialState: DiscoverAppState = {
    dataSource: createDataViewDataSource({ dataViewId: 'the-index' }),
    columns: ['the-column'],
    sort: [],
    query: { query: 'the-query', language: 'kuery' },
    filters: [],
    interval: 'auto',
    hideChart: true,
    sampleSize: 100,
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    savedQuery: undefined,
    hideAggregatedPreview: true,
    rowHeight: 25,
    headerRowHeight: 25,
    grid: {},
    breakdownField: 'the-breakdown-field',
  };

  test('returns true if the states are equal', () => {
    expect(isEqualState(initialState, { ...initialState })).toBeTruthy();
  });

  test('handles the special filter change case correctly ', () => {
    // this is some sort of legacy behavior, especially for the filter case
    const previousState = { ...initialState, filters: [{ index: 'test', meta: {} }] };
    const nextState = {
      ...initialState,
      filters: [{ index: 'test', meta: {}, $$hashKey: 'hi' }],
    };
    expect(isEqualState(previousState, nextState)).toBeTruthy();
  });

  test('returns true if the states are not equal', () => {
    const changedParams = [
      { dataSource: createDataViewDataSource({ dataViewId: 'the-new-index' }) },
      { columns: ['newColumns'] },
      { sort: [['column', 'desc']] },
      { query: { query: 'ok computer', language: 'pirate-english' } },
      { filters: [{ index: 'test', meta: {} }] },
      { interval: 'eternity' },
      { hideChart: undefined },
      { sampleSize: 1 },
      { viewMode: undefined },
      { savedQuery: 'sdsd' },
      { hideAggregatedPreview: false },
      { rowHeight: 100 },
      { headerRowHeight: 1 },
      { grid: { test: 'test' } },
      { breakdownField: 'new-breakdown-field' },
    ];
    changedParams.forEach((param) => {
      expect(isEqualState(initialState, { ...initialState, ...param })).toBeFalsy();
    });
  });

  test('allows to exclude variables from comparison', () => {
    expect(
      isEqualState(initialState, { ...initialState, dataSource: undefined }, ['dataSource'])
    ).toBeTruthy();
  });
});
