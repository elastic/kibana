/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from '../node_types';
import { fields } from '../../filters/stubs';

import * as is from './is';
import { DataViewBase } from '../..';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

jest.mock('../grammar');

describe('kuery functions', () => {
  describe('is', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the provided fieldName and value as literals', () => {
        const {
          arguments: [fieldName, value],
        } = is.buildNodeParams('response', 200);

        expect(fieldName).toHaveProperty('type', 'literal');
        expect(fieldName).toHaveProperty('value', 'response');
        expect(value).toHaveProperty('type', 'literal');
        expect(value).toHaveProperty('value', 200);
      });

      test('should detect wildcards in the provided arguments', () => {
        const {
          arguments: [fieldName, value],
        } = is.buildNodeParams('machine*', 'win*');

        expect(fieldName).toHaveProperty('type', 'wildcard');
        expect(value).toHaveProperty('type', 'wildcard');
      });

      test('should default to a non-phrase query', () => {
        const {
          arguments: [, , isPhrase],
        } = is.buildNodeParams('response', 200);
        expect(isPhrase.value).toBe(false);
      });

      test('should allow specification of a phrase query', () => {
        const {
          arguments: [, , isPhrase],
        } = is.buildNodeParams('response', 200, true);
        expect(isPhrase.value).toBe(true);
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return an ES match_all query when fieldName and value are both "*"', () => {
        const expected = {
          match_all: {},
        };
        const node = nodeTypes.function.buildNode('is', '*', '*');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES match_all query for queries that match all fields and values', () => {
        const expected = {
          match_all: {},
        };
        const node = nodeTypes.function.buildNode('is', 'n*', '*');
        const result = is.toElasticsearchQuery(node, {
          ...indexPattern,
          fields: indexPattern.fields.filter((field) => field.name.startsWith('n')),
        });

        expect(result).toEqual(expected);
      });

      test('should return an ES match_all query for * queries without an index pattern', () => {
        const expected = {
          match_all: {},
        };
        const node = nodeTypes.function.buildNode('is', '*', '*');
        const result = is.toElasticsearchQuery(node);

        expect(result).toEqual(expected);
      });

      test('should return an ES multi_match query using default_field when fieldName is null', () => {
        const expected = {
          multi_match: {
            query: 200,
            type: 'best_fields',
            lenient: true,
          },
        };
        const node = nodeTypes.function.buildNode('is', null, 200);
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES query_string query using default_field when fieldName is null and value contains a wildcard', () => {
        const expected = {
          query_string: {
            query: 'jpg*',
          },
        };
        const node = nodeTypes.function.buildNode('is', null, 'jpg*');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES bool query with a sub-query for each field when fieldName is "*"', () => {
        const node = nodeTypes.function.buildNode('is', '*', 200);
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('bool');
        expect((result.bool!.should! as estypes.QueryDslQueryContainer[]).length).toBe(
          indexPattern.fields.length
        );
      });

      test('should return an ES exists query when value is "*"', () => {
        const expected = {
          bool: {
            should: [{ exists: { field: 'extension' } }],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', 'extension', '*');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES match query when a concrete fieldName and value are provided', () => {
        const expected = {
          bool: {
            should: [{ match: { extension: 'jpg' } }],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES match query when a concrete fieldName and value are provided without an index pattern', () => {
        const expected = {
          bool: {
            should: [{ match: { extension: 'jpg' } }],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg');
        const result = is.toElasticsearchQuery(node);

        expect(result).toEqual(expected);
      });

      test('should support creation of phrase queries', () => {
        const expected = {
          bool: {
            should: [{ match_phrase: { extension: 'jpg' } }],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg', true);
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should create a query_string query for wildcard values', () => {
        const expected = {
          bool: {
            should: [
              {
                query_string: {
                  fields: ['extension'],
                  query: 'jpg*',
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg*');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should support scripted fields', () => {
        const node = nodeTypes.function.buildNode('is', 'script string', 'foo');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect((result.bool!.should as estypes.QueryDslQueryContainer[])[0]).toHaveProperty(
          'script'
        );
      });

      test('should support date fields without a dateFormat provided', () => {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  '@timestamp': {
                    gte: '2018-04-03T19:04:17',
                    lte: '2018-04-03T19:04:17',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', '@timestamp', '"2018-04-03T19:04:17"');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should support date fields with a dateFormat provided', () => {
        const config = { dateFormatTZ: 'America/Phoenix' };
        const expected = {
          bool: {
            should: [
              {
                range: {
                  '@timestamp': {
                    gte: '2018-04-03T19:04:17',
                    lte: '2018-04-03T19:04:17',
                    time_zone: 'America/Phoenix',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', '@timestamp', '"2018-04-03T19:04:17"');
        const result = is.toElasticsearchQuery(node, indexPattern, config);

        expect(result).toEqual(expected);
      });

      test('should use a provided nested context to create a full field name', () => {
        const expected = {
          bool: {
            should: [{ match: { 'nestedField.extension': 'jpg' } }],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg');
        const result = is.toElasticsearchQuery(
          node,
          indexPattern,
          {},
          { nested: { path: 'nestedField' } }
        );

        expect(result).toEqual(expected);
      });

      test('should support wildcard field names', () => {
        const expected = {
          bool: {
            should: [{ match: { extension: 'jpg' } }],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', 'ext*', 'jpg');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should automatically add a nested query when a wildcard field name covers a nested field', () => {
        const expected = {
          bool: {
            should: [
              {
                nested: {
                  path: 'nestedField.nestedChild',
                  query: {
                    match: {
                      'nestedField.nestedChild.doublyNestedChild': 'foo',
                    },
                  },
                  score_mode: 'none',
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('is', '*doublyNested*', 'foo');
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });
    });
  });
});
