/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEmptyFilter, Filter, FilterItem } from '@kbn/es-query';
import { ConditionTypes } from '../utils';
import {
  getFilterByPath,
  getPathInArray,
  addFilter,
  removeFilter,
  moveFilter,
  normalizeFilters,
} from './filters_builder_utils';
import { getConditionalOperationType } from '../utils';

import {
  getDataAfterNormalized,
  getDataThatNeedNotNormalized,
  getDataThatNeedsNormalized,
  getFiltersMock,
} from './__mock__/filters';

describe('filters_builder_utils', () => {
  let filters: Filter[];
  beforeAll(() => {
    filters = getFiltersMock();
  });

  describe('getFilterByPath', () => {
    test('should return correct filterByPath', () => {
      expect(getFilterByPath(filters, '0')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 1",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 1",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '2')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 6",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 6",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '1.2')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 5",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 5",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '1.1.1')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 4",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 4",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '1.1')).toMatchInlineSnapshot(`
        Array [
          Object {
            "$state": Object {
              "store": "appState",
            },
            "meta": Object {
              "alias": null,
              "disabled": false,
              "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
              "key": "category.keyword",
              "negate": false,
              "params": Object {
                "query": "Men's Accessories 3",
              },
              "type": "phrase",
            },
            "query": Object {
              "match_phrase": Object {
                "category.keyword": "Men's Accessories 3",
              },
            },
          },
          Object {
            "$state": Object {
              "store": "appState",
            },
            "meta": Object {
              "alias": null,
              "disabled": false,
              "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
              "key": "category.keyword",
              "negate": false,
              "params": Object {
                "query": "Men's Accessories 4",
              },
              "type": "phrase",
            },
            "query": Object {
              "match_phrase": Object {
                "category.keyword": "Men's Accessories 4",
              },
            },
          },
        ]
      `);
    });
  });

  describe('getConditionalOperationType', () => {
    let filter: Filter;
    let filtersWithOrRelationships: FilterItem;
    let groupOfFilters: FilterItem;

    beforeAll(() => {
      filter = filters[0];
      filtersWithOrRelationships = filters[1];
      groupOfFilters = filters[1].meta.params;
    });

    test('should return correct ConditionalOperationType', () => {
      expect(getConditionalOperationType(filter)).toBeUndefined();
      expect(getConditionalOperationType(filtersWithOrRelationships)).toBe(ConditionTypes.OR);
      expect(getConditionalOperationType(groupOfFilters)).toBe(ConditionTypes.AND);
    });
  });

  describe('getPathInArray', () => {
    test('should return correct path in array from path', () => {
      expect(getPathInArray('0')).toStrictEqual([0]);
      expect(getPathInArray('1.1')).toStrictEqual([1, 1]);
      expect(getPathInArray('1.0.2')).toStrictEqual([1, 0, 2]);
    });
  });

  describe('addFilter', () => {
    const emptyFilter = buildEmptyFilter(false);

    test('should add filter into filters after zero element', () => {
      const enlargedFilters = addFilter(filters, emptyFilter, '0', ConditionTypes.AND);
      expect(getFilterByPath(enlargedFilters, '1')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": undefined,
            "negate": false,
          },
        }
      `);
    });
  });

  describe('removeFilter', () => {
    test('should remove filter from filters', () => {
      const path = '1.1';
      const filterBeforeRemoved = getFilterByPath(filters, path);
      const filtersAfterRemoveFilter = removeFilter(filters, path);
      const filterObtainedAfterFilterRemovalFromFilters = getFilterByPath(
        filtersAfterRemoveFilter,
        path
      );

      expect(filterBeforeRemoved).not.toBe(filterObtainedAfterFilterRemovalFromFilters);
    });
  });

  describe('moveFilter', () => {
    test('should move filter from "0" path to "2" path into filters', () => {
      const filterBeforeMoving = getFilterByPath(filters, '0');
      const filtersAfterMovingFilter = moveFilter(filters, '0', '2', ConditionTypes.AND);
      const filterObtainedAfterFilterMovingFilters = getFilterByPath(filtersAfterMovingFilter, '2');
      expect(filterBeforeMoving).toEqual(filterObtainedAfterFilterMovingFilters);
    });
  });

  describe('normalizeFilters', () => {
    test('should normalize filter after removed filter', () => {
      const dataNeedsNormalized = getDataThatNeedsNormalized();
      const dataAfterNormalized = getDataAfterNormalized();
      expect(normalizeFilters(dataNeedsNormalized)).toEqual(dataAfterNormalized);
    });

    test('should not normalize filter after removed filter', () => {
      const dataNeedNotNormalized = getDataThatNeedNotNormalized();
      const dataAfterNormalized = getDataThatNeedNotNormalized();
      expect(normalizeFilters(dataNeedNotNormalized)).toEqual(dataAfterNormalized);
    });
  });
});
