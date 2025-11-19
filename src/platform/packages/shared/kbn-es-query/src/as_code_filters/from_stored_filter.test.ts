/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromStoredFilter,
  convertToSimpleCondition,
  convertWithEnhancement,
  extractFieldFromQuery,
  convertToFilterGroup,
} from './from_stored_filter';
import { FilterConversionError } from './errors';
import { isConditionFilter, isGroupFilter, isDSLFilter } from './type_guards';
import type { StoredFilter } from './types';
import { spatialFilterFixture } from '../__fixtures__/spatial_filter';

describe('fromStoredFilter', () => {
  describe('Input validation', () => {
    it('should throw for null/undefined input', () => {
      expect(() => fromStoredFilter(null)).toThrow(FilterConversionError);
      expect(() => fromStoredFilter(undefined)).toThrow(FilterConversionError);
    });
  });

  describe('Legacy filter migration', () => {
    it('should migrate legacy range filter with top-level range property', () => {
      // Legacy Kibana filter format: top-level range property
      const legacyRangeFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          key: 'bytes',
          field: 'bytes',
          params: { gte: '3000' },
          type: 'range',
        },
        range: { bytes: { gte: '3000' } },
        $state: { store: 'appState' },
      };

      const result = fromStoredFilter(legacyRangeFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'bytes',
          operator: 'range',
          value: { gte: '3000' },
        });
      }
    });

    it('should migrate legacy phrase filter with top-level match_phrase', () => {
      // Legacy Kibana filter format: top-level match_phrase property
      const legacyPhraseFilter = {
        meta: {
          alias: null,
          disabled: false,
          field: 'geo.src',
          key: 'geo.src',
          negate: false,
          params: { query: 'CN' },
          type: 'phrase',
        },
        match_phrase: { 'geo.src': 'CN' },
        $state: { store: 'appState' },
      };

      const result = fromStoredFilter(legacyPhraseFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'geo.src',
          operator: 'is',
          value: 'CN',
        });
      }
    });

    it('should migrate legacy exists filter with top-level exists property', () => {
      // Legacy Kibana filter format: top-level exists property
      const legacyExistsFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          key: 'user.name',
          type: 'exists',
        },
        exists: { field: 'user.name' },
        $state: { store: 'appState' },
      };

      const result = fromStoredFilter(legacyExistsFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'user.name',
          operator: 'exists',
        });
      }
    });

    it('should migrate legacy match_all filter', () => {
      // Legacy Kibana filter format: top-level match_all property
      const legacyMatchAllFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: 'All documents',
          type: 'match_all',
        },
        match_all: {},
        $state: { store: 'globalState' },
      };

      const result = fromStoredFilter(legacyMatchAllFilter);

      // match_all gets preserved as DSL since it's a special case
      expect(isDSLFilter(result) || isConditionFilter(result)).toBe(true);
    });
  });

  describe('Strategy 1: Simple Conditions (metadata-only)', () => {
    it('should convert phrase filters from meta.params', () => {
      const storedFilter = {
        meta: {
          type: 'phrase',
          key: 'status',
          params: { query: 'active' },
        },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'status',
          operator: 'is',
          value: 'active',
        });
      }
    });

    it('should handle negated filters', () => {
      const storedFilter = {
        meta: { key: 'status', negate: true },
        query: { term: { status: 'inactive' } },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition.operator).toBe('is_not');
      }
    });
  });

  describe('Strategy 2: Query Parsing (enhanced compatibility)', () => {
    it('should parse match_phrase query when meta is incomplete', () => {
      const storedFilter = {
        meta: { key: 'message' },
        query: {
          match_phrase: {
            message: 'error occurred',
          },
        },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'message',
          operator: 'is',
          value: 'error occurred',
        });
      }
    });

    it('should extract field from query when missing from meta', () => {
      const storedFilter = {
        meta: {},
        query: { term: { username: 'john' } },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition.field).toBe('username');
      }
    });
  });

  describe('Strategy 3: Filter Groups (combined/bool filters)', () => {
    it('should convert boolean group filters with must clauses', () => {
      const storedFilter = {
        meta: {},
        query: {
          bool: {
            must: [{ term: { status: 'active' } }, { term: { type: 'user' } }],
          },
        },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isGroupFilter(result)).toBe(true);
      if (isGroupFilter(result)) {
        expect(result.group).toEqual({
          type: 'and',
          conditions: expect.arrayContaining([
            expect.objectContaining({ field: 'status', operator: 'is', value: 'active' }),
            expect.objectContaining({ field: 'type', operator: 'is', value: 'user' }),
          ]),
        });
      }
    });

    it('should convert combined filters with nested groups', () => {
      const storedFilter = {
        $state: {
          store: 'appState',
        },
        meta: {
          type: 'combined',
          relation: 'AND',
          params: [
            {
              query: {
                match_phrase: {
                  'machine.os.keyword': 'win 7',
                },
              },
              meta: {
                negate: true,
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                key: 'machine.os.keyword',
                field: 'machine.os.keyword',
                params: {
                  query: 'win 7',
                },
                type: 'phrase',
                disabled: false,
              },
            },
            {
              $state: {
                store: 'appState',
              },
              meta: {
                type: 'combined',
                relation: 'OR',
                params: [
                  {
                    query: {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match_phrase: {
                              'geo.src': 'US',
                            },
                          },
                        ],
                      },
                    },
                    meta: {
                      negate: false,
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      key: 'geo.src',
                      field: 'geo.src',
                      params: ['US'],
                      value: ['US'],
                      type: 'phrases',
                      disabled: false,
                    },
                  },
                  {
                    meta: {
                      negate: false,
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      key: 'host.keyword',
                      field: 'host.keyword',
                      params: {
                        query: 'www.elastic.co',
                      },
                      type: 'phrase',
                      disabled: false,
                    },
                    query: {
                      match_phrase: {
                        'host.keyword': 'www.elastic.co',
                      },
                    },
                  },
                ],
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                disabled: false,
                negate: false,
              },
            },
          ],
          index: '90943e30-9a47-11e8-b64d-95841ca0b247',
          disabled: false,
          negate: false,
          alias: null,
        },
        query: {},
      };

      const result = fromStoredFilter(storedFilter);

      expect(isGroupFilter(result)).toBe(true);
      if (isGroupFilter(result)) {
        expect(result.group).toMatchInlineSnapshot(`
          Object {
            "conditions": Array [
              Object {
                "field": "machine.os.keyword",
                "operator": "is_not",
                "value": "win 7",
              },
              Object {
                "conditions": Array [
                  Object {
                    "conditions": Array [
                      Object {
                        "field": "geo.src",
                        "operator": "is",
                        "value": "US",
                      },
                    ],
                    "type": "or",
                  },
                  Object {
                    "field": "host.keyword",
                    "operator": "is",
                    "value": "www.elastic.co",
                  },
                ],
                "type": "or",
              },
            ],
            "type": "and",
          }
        `);
      }
    });
  });

  describe('Strategy 4: DSL Fallback (preserve complex filters)', () => {
    it('should preserve script queries as DSL', () => {
      const storedFilter = {
        meta: {},
        query: {
          script: {
            script: {
              source: "doc['field'].value > params.threshold",
              params: { threshold: 100 },
            },
          },
        },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl).toEqual({
          query: storedFilter.query,
        });
      }
    });

    it('should preserve spatial filters with geo_shape queries as DSL', () => {
      const spatialFilter = spatialFilterFixture;

      const result = fromStoredFilter(spatialFilter);

      // Should be converted to DSL format due to geo_shape complexity
      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl.query).toEqual(spatialFilter.query);
        expect(result.label).toBe('intersects shape');
        expect(result.disabled).toBe(false);
        expect(result.negate).toBe(false);
        expect(result.pinned).toBe(false); // appState = not pinned
      }
    });

    it('should preserve isMultiIndex property in meta for spatial filters', () => {
      const spatialFilter = spatialFilterFixture;

      const result = fromStoredFilter(spatialFilter);

      // Verify isMultiIndex is extracted from meta
      expect(isDSLFilter(result)).toBe(true);
      expect(result.isMultiIndex).toBe(true);
    });
  });

  describe('Base properties extraction', () => {
    it('should extract pinned, disabled, label, and negate properties', () => {
      const storedFilter = {
        $state: { store: 'globalState' },
        meta: {
          key: 'status',
          disabled: true,
          alias: 'Status Filter',
          negate: true,
        },
        query: { term: { status: 'active' } },
      };

      const result = fromStoredFilter(storedFilter);

      expect(result.pinned).toBe(true);
      expect(result.disabled).toBe(true);
      expect(result.label).toBe('Status Filter');
      expect(result.negate).toBe(true);
    });
  });

  describe('Helper: convertToSimpleCondition', () => {
    it('should convert exists queries', () => {
      const storedFilter = {
        meta: { key: 'field' },
        query: { exists: { field: 'test_field' } },
      };

      const result = convertToSimpleCondition(storedFilter);

      expect(result).toEqual({
        field: 'field',
        operator: 'exists',
      });
    });

    it('should convert range queries', () => {
      const storedFilter = {
        meta: { key: 'age' },
        query: {
          range: {
            age: { gte: 18, lte: 65 },
          },
        },
      };

      const result = convertToSimpleCondition(storedFilter);

      expect(result).toEqual({
        field: 'age',
        operator: 'range',
        value: { gte: 18, lte: 65 },
      });
    });

    it('should throw for unsupported query structures', () => {
      const storedFilter = {
        meta: { key: 'field' },
        query: { unsupported_query: { field: 'value' } },
      };

      expect(() => convertToSimpleCondition(storedFilter)).toThrow(FilterConversionError);
    });
  });

  describe('Helper: convertWithEnhancement', () => {
    it('should parse match_phrase queries', () => {
      const storedFilter = {
        meta: {},
        query: {
          match_phrase: {
            message: 'error occurred',
          },
        },
      };

      const result = convertWithEnhancement(storedFilter);

      expect(result).toEqual({
        field: 'message',
        operator: 'is',
        value: 'error occurred',
      });
    });

    it('should parse match_phrase queries with object values', () => {
      const storedFilter = {
        meta: {},
        query: {
          match_phrase: {
            message: { query: 'error occurred' },
          },
        },
      };

      const result = convertWithEnhancement(storedFilter);

      expect(result).toEqual({
        field: 'message',
        operator: 'is',
        value: 'error occurred',
      });
    });

    it('should parse match queries with phrase type', () => {
      const storedFilter = {
        meta: {},
        query: {
          match: {
            message: {
              type: 'phrase',
              query: 'test message',
            },
          },
        },
      };

      const result = convertWithEnhancement(storedFilter);

      expect(result).toEqual({
        field: 'message',
        operator: 'is',
        value: 'test message',
      });
    });
  });

  describe('Helper: convertToFilterGroup', () => {
    it('should convert combined filters with nested groups', () => {
      const storedFilter = {
        $state: {
          store: 'appState',
        },
        meta: {
          type: 'combined',
          relation: 'AND',
          params: [
            {
              query: {
                match_phrase: {
                  'machine.os.keyword': 'win 7',
                },
              },
              meta: {
                negate: true,
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                key: 'machine.os.keyword',
                field: 'machine.os.keyword',
                params: {
                  query: 'win 7',
                },
                type: 'phrase',
                disabled: false,
              },
            },
            {
              $state: {
                store: 'appState',
              },
              meta: {
                type: 'combined',
                relation: 'OR',
                params: [
                  {
                    query: {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match_phrase: {
                              'geo.src': 'US',
                            },
                          },
                        ],
                      },
                    },
                    meta: {
                      negate: false,
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      key: 'geo.src',
                      field: 'geo.src',
                      params: ['US'],
                      value: ['US'],
                      type: 'phrases',
                      disabled: false,
                    },
                  },
                  {
                    meta: {
                      negate: false,
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      key: 'host.keyword',
                      field: 'host.keyword',
                      params: {
                        query: 'www.elastic.co',
                      },
                      type: 'phrase',
                      disabled: false,
                    },
                    query: {
                      match_phrase: {
                        'host.keyword': 'www.elastic.co',
                      },
                    },
                  },
                ],
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                disabled: false,
                negate: false,
              },
            },
          ],
          index: '90943e30-9a47-11e8-b64d-95841ca0b247',
          disabled: false,
          negate: false,
          alias: null,
        },
        query: {},
      } as StoredFilter;

      const result = convertToFilterGroup(storedFilter);

      expect(result).toMatchInlineSnapshot(`
        Object {
          "conditions": Array [
            Object {
              "field": "machine.os.keyword",
              "operator": "is_not",
              "value": "win 7",
            },
            Object {
              "conditions": Array [
                Object {
                  "conditions": Array [
                    Object {
                      "field": "geo.src",
                      "operator": "is",
                      "value": "US",
                    },
                  ],
                  "type": "or",
                },
                Object {
                  "field": "host.keyword",
                  "operator": "is",
                  "value": "www.elastic.co",
                },
              ],
              "type": "or",
            },
          ],
          "type": "and",
        }
      `);
    });
  });

  describe('Helper: extractFieldFromQuery', () => {
    it('should extract field from term queries', () => {
      const query = { term: { status: 'active' } };
      expect(extractFieldFromQuery(query)).toBe('status');
    });

    it('should extract field from terms queries', () => {
      const query = { terms: { tags: ['urgent', 'bug'] } };
      expect(extractFieldFromQuery(query)).toBe('tags');
    });

    it('should extract field from range queries', () => {
      const query = { range: { age: { gte: 18 } } };
      expect(extractFieldFromQuery(query)).toBe('age');
    });

    it('should extract field from exists queries', () => {
      const query = { exists: { field: 'username' } };
      expect(extractFieldFromQuery(query)).toBe('username');
    });

    it('should extract field from match queries', () => {
      const query = { match: { message: 'error' } };
      expect(extractFieldFromQuery(query)).toBe('message');
    });

    it('should return null for unsupported queries', () => {
      const query = { script: { source: 'doc.field.value > 0' } };
      expect(extractFieldFromQuery(query)).toBe(null);
    });
  });
});
