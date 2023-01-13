/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildQueryFilter, Filter, FilterStateStore } from '../build_filters';
import { updateFilter } from './update_filter';

describe('updateFilter', () => {
  test('should return the correct filter with type undefined if the given operator is undefined', () => {
    const filter: Filter = {
      $state: { store: FilterStateStore.GLOBAL_STATE },
      ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', ''),
    };
    const updatedFilter = updateFilter(filter, 'test-field');
    expect(updatedFilter).toStrictEqual({
      $state: { store: 'globalState' },
      meta: {
        alias: '',
        field: 'test-field',
        index: 'index1',
        key: 'test-field',
        params: { query: undefined },
        type: undefined,
        value: undefined,
      },
      query: undefined,
    });
  });

  test('should return the correct filter if the operator type is exists', () => {
    const filter: Filter = {
      $state: { store: FilterStateStore.GLOBAL_STATE },
      ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', ''),
    };
    const operator = {
      message: 'exists',
      type: 'exists',
      negate: false,
    };
    const updatedFilter = updateFilter(filter, 'test-field', operator);
    expect(updatedFilter).toStrictEqual({
      $state: { store: 'globalState' },
      meta: {
        alias: '',
        index: 'index1',
        params: undefined,
        negate: false,
        type: 'exists',
        value: 'exists',
      },
      query: { exists: { field: filter.meta.key } },
    });
  });

  test('should return the correct filter if the operator type is exists even if params are given', () => {
    const filter: Filter = {
      $state: { store: FilterStateStore.GLOBAL_STATE },
      ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', ''),
    };
    const operator = {
      message: 'exists',
      type: 'exists',
      negate: false,
    };
    const updatedFilter = updateFilter(filter, 'test-field', operator, [100]);
    expect(updatedFilter).toStrictEqual({
      $state: { store: 'globalState' },
      meta: {
        alias: '',
        index: 'index1',
        params: undefined,
        negate: false,
        type: 'exists',
        value: 'exists',
      },
      query: { exists: { field: filter.meta.key } },
    });
  });

  test('should return the correct filter for the is operator', () => {
    const filter: Filter = {
      $state: { store: FilterStateStore.GLOBAL_STATE },
      ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', '', {
        key: 'test-field',
      }),
    };
    const operator = {
      message: 'is',
      type: 'phrase',
      negate: true,
    };
    const updatedFilter = updateFilter(filter, 'test-field', operator, 10);
    expect(updatedFilter).toStrictEqual({
      $state: { store: 'globalState' },
      meta: {
        alias: '',
        index: 'index1',
        params: { query: 10 },
        key: 'test-field',
        negate: true,
        type: 'phrase',
        value: undefined,
      },
      query: { match_phrase: { 'test-field': 10 } },
    });
  });

  test('should return the correct filter for the range operator without params', () => {
    const filter: Filter = {
      $state: { store: FilterStateStore.GLOBAL_STATE },
      ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', '', {
        key: 'test-field',
      }),
    };
    const operator = {
      message: 'is between',
      type: 'range',
      negate: false,
    };
    const updatedFilter = updateFilter(filter, 'test-field', operator);
    expect(updatedFilter).toStrictEqual({
      $state: { store: 'globalState' },
      meta: {
        alias: '',
        index: 'index1',
        params: {
          gte: undefined,
          lt: undefined,
        },
        key: 'test-field',
        negate: false,
        type: 'range',
      },
      query: {
        range: {
          'test-field': {
            gte: undefined,
            lt: undefined,
          },
        },
      },
    });
  });

  test('should return the correct filter for the range operator with params', () => {
    const filter: Filter = {
      $state: { store: FilterStateStore.GLOBAL_STATE },
      ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', '', {
        key: 'test-field',
      }),
    };
    const operator = {
      message: 'is between',
      type: 'range',
      negate: false,
    };
    const updatedFilter = updateFilter(filter, 'test-field', operator, {
      from: 10,
      to: 20,
      query: 200,
    });
    expect(updatedFilter).toStrictEqual({
      $state: { store: 'globalState' },
      meta: {
        alias: '',
        index: 'index1',
        params: {
          gte: 10,
          lt: 20,
        },
        key: 'test-field',
        negate: false,
        type: 'range',
      },
      query: {
        range: {
          'test-field': {
            gte: 10,
            lt: 20,
          },
        },
      },
    });
  });

  test('should return the correct filter for is one of operator', () => {
    const filter: Filter = {
      $state: { store: FilterStateStore.GLOBAL_STATE },
      ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', '', {
        key: 'test-field',
      }),
    };
    const operator = {
      message: 'is one of',
      type: 'phrases',
      negate: true,
    };
    const updatedFilter = updateFilter(filter, 'test-field', operator, ['value1', 'value2']);
    expect(updatedFilter).toStrictEqual({
      $state: { store: 'globalState' },
      meta: {
        alias: '',
        index: 'index1',
        params: ['value1', 'value2'],
        key: 'test-field',
        negate: true,
        type: 'phrases',
      },
      query: {
        bool: {
          minimum_should_match: 1,
          ...filter!.query?.should,
          should: [
            {
              match_phrase: { 'test-field': 'value1' },
            },
            {
              match_phrase: { 'test-field': 'value2' },
            },
          ],
        },
      },
    });
  });
});
