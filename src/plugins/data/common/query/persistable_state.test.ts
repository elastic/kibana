/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extract, inject, getAllMigrations } from './persistable_state';
import { Filter } from '@kbn/es-query';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { QueryState } from './query_state';

describe('query service persistable state tests', () => {
  const filters: Filter[] = [
    { meta: { alias: 'test', disabled: false, negate: false, index: 'test' } },
  ];
  const query = { language: 'kql', query: 'query' };
  const time = { from: new Date().toISOString(), to: new Date().toISOString() };
  const refreshInterval = { pause: false, value: 10 };

  const queryState: QueryState = {
    filters,
    query,
    time,
    refreshInterval,
  };

  describe('reference injection', () => {
    test('correctly inserts reference to filter', () => {
      const updatedQueryState = inject(queryState, [
        { type: DATA_VIEW_SAVED_OBJECT_TYPE, name: 'test', id: '123' },
      ]);
      expect(updatedQueryState.filters[0]).toHaveProperty('meta.index', '123');
      expect(updatedQueryState.query).toEqual(queryState.query);
      expect(updatedQueryState.time).toEqual(queryState.time);
      expect(updatedQueryState.refreshInterval).toEqual(queryState.refreshInterval);
    });

    test('drops index setting from filter if reference is missing', () => {
      const updatedQueryState = inject(queryState, [
        { type: DATA_VIEW_SAVED_OBJECT_TYPE, name: 'test123', id: '123' },
      ]);
      expect(updatedQueryState.filters[0]).toHaveProperty('meta.index', 'test');
    });
  });

  describe('reference extraction', () => {
    test('correctly extracts references', () => {
      const { state, references } = extract(queryState);
      expect(state.filters[0]).toHaveProperty('meta.index');
      expect(references[0]).toHaveProperty('id', 'test');

      expect(state.query).toEqual(queryState.query);
      expect(state.time).toEqual(queryState.time);
      expect(state.refreshInterval).toEqual(queryState.refreshInterval);
    });
  });

  describe('migrations', () => {
    test('getAllMigrations', () => {
      expect(getAllMigrations()).toEqual({});
    });
  });
});
