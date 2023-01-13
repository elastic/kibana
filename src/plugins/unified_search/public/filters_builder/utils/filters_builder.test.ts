/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEmptyFilter, type Filter, BooleanRelation } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  getFilterByPath,
  getPathInArray,
  addFilter,
  removeFilter,
  moveFilter,
  normalizeFilters,
} from './filters_builder';
import { getBooleanRelationType } from '../../utils';

import {
  getDataAfterNormalized,
  getDataThatNeedNotNormalized,
  getDataThatNeedsNormalized,
  getFiltersMock,
} from '../__mock__/filters';

describe('filters_builder', () => {
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
        Object {
          "meta": Object {
            "params": Array [
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
            ],
            "relation": "AND",
            "type": "combined",
          },
        }
      `);
    });
  });

  describe('getBooleanRelationType', () => {
    let filter: Filter;
    let filtersWithOrRelationships: Filter;
    let groupOfFilters: Filter;

    beforeAll(() => {
      filter = filters[0];
      filtersWithOrRelationships = filters[1];
      groupOfFilters = filters[1].meta.params[1];
    });

    test('should return correct ConditionalOperationType', () => {
      expect(getBooleanRelationType(filter)).toBeUndefined();
      expect(getBooleanRelationType(filtersWithOrRelationships)).toBe(BooleanRelation.OR);
      expect(getBooleanRelationType(groupOfFilters)).toBe(BooleanRelation.AND);
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
      const enlargedFilters = addFilter(
        filters,
        emptyFilter,
        { index: 1, path: '0' },
        BooleanRelation.AND,
        {
          id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        } as DataView
      );
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
      const filtersAfterRemoveFilter = removeFilter(filters, { index: 1, path });
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
      const filtersAfterMovingFilter = moveFilter(
        filters,
        { path: '0', index: 1 },
        { path: '2', index: 3 },
        BooleanRelation.AND,
        {
          id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        } as DataView
      );
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
