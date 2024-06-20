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
import { DataViewBase } from '../../..';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KQL_NODE_TYPE_WILDCARD } from '../node_types/wildcard';
import { KQL_NODE_TYPE_LITERAL } from '../node_types/literal';
import { KqlIsFunctionNode } from './is';

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

        expect(fieldName).toHaveProperty('type', KQL_NODE_TYPE_LITERAL);
        expect(fieldName).toHaveProperty('value', 'response');
        expect(value).toHaveProperty('type', KQL_NODE_TYPE_LITERAL);
        expect(value).toHaveProperty('value', 200);
      });

      test('should detect wildcards in the provided arguments', () => {
        const {
          arguments: [fieldName, value],
        } = is.buildNodeParams('machine*', 'win*');

        expect(fieldName).toHaveProperty('type', KQL_NODE_TYPE_WILDCARD);
        expect(value).toHaveProperty('type', KQL_NODE_TYPE_WILDCARD);
      });

      test('should default to a non-phrase query', () => {
        const {
          arguments: [, value],
        } = is.buildNodeParams('response', 200);
        expect(value.isQuoted).toBe(false);
      });

      test('should allow specification of a phrase query', () => {
        const {
          arguments: [, value],
        } = is.buildNodeParams('response', '"200"');
        expect(value.isQuoted).toBe(true);
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return an ES match_all query when fieldName and value are both "*"', () => {
        const expected = {
          match_all: {},
        };
        const node = nodeTypes.function.buildNode('is', '*', '*') as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES match_all query for * queries without an index pattern', () => {
        const expected = {
          match_all: {},
        };
        const node = nodeTypes.function.buildNode('is', '*', '*') as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', null, 200) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES query_string query using default_field when fieldName is null and value contains a wildcard', () => {
        const expected = {
          query_string: {
            query: 'jpg*',
          },
        };
        const node = nodeTypes.function.buildNode('is', null, 'jpg*') as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES bool query with a sub-query for each field when fieldName is "*"', () => {
        const node = nodeTypes.function.buildNode('is', '*', 200) as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', 'extension', '*') as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg') as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg') as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', 'extension', '"jpg"') as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg*') as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should create a wildcard query for keyword fields', () => {
        const expected = {
          bool: {
            should: [
              {
                wildcard: {
                  'machine.os.keyword': { value: 'win*' },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode(
          'is',
          'machine.os.keyword',
          'win*'
        ) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should create a case-insensitive wildcard query for keyword fields', () => {
        const expected = {
          bool: {
            should: [
              {
                wildcard: {
                  'machine.os.keyword': { value: 'win*', case_insensitive: true },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode(
          'is',
          'machine.os.keyword',
          'win*'
        ) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern, { caseInsensitive: true });

        expect(result).toEqual(expected);
      });

      test('should create a wildcard query with backslashes properly escaped', () => {
        const expected = {
          bool: {
            should: [
              {
                wildcard: {
                  'machine.os.keyword': { value: '*\\\\*' },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode(
          'is',
          'machine.os.keyword',
          '*\\\\*'
        ) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should support scripted fields', () => {
        const node = nodeTypes.function.buildNode(
          'is',
          'script string',
          'foo'
        ) as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode(
          'is',
          '@timestamp',
          '"2018-04-03T19:04:17"'
        ) as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode(
          'is',
          '@timestamp',
          '"2018-04-03T19:04:17"'
        ) as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg') as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode('is', 'ext*', 'jpg') as KqlIsFunctionNode;
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
        const node = nodeTypes.function.buildNode(
          'is',
          '*doublyNested*',
          'foo'
        ) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should allow to configure ignore_unmapped for a nested query', () => {
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
                  ignore_unmapped: true,
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode(
          'is',
          '*doublyNested*',
          'foo'
        ) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern, { nestedIgnoreUnmapped: true });

        expect(result).toEqual(expected);
      });

      test('should use a term query for keyword fields', () => {
        const node = nodeTypes.function.buildNode(
          'is',
          'machine.os.keyword',
          'Win 7'
        ) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).toEqual({
          bool: {
            should: [
              {
                term: {
                  'machine.os.keyword': { value: 'Win 7' },
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      });

      test('should use a case-insensitive term query for keyword fields', () => {
        const node = nodeTypes.function.buildNode(
          'is',
          'machine.os.keyword',
          'Win 7'
        ) as KqlIsFunctionNode;
        const result = is.toElasticsearchQuery(node, indexPattern, { caseInsensitive: true });
        expect(result).toEqual({
          bool: {
            should: [
              {
                term: {
                  'machine.os.keyword': { value: 'Win 7', case_insensitive: true },
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      });
    });

    describe('toKqlExpression', () => {
      test('match all fields and all values', () => {
        const node = nodeTypes.function.buildNode('is', '*', '*') as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"*: *"`);
      });

      test('no field with literal value', () => {
        const node = nodeTypes.function.buildNode('is', null, 200) as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"200"`);
      });

      test('no field with wildcard value', () => {
        const node = nodeTypes.function.buildNode('is', null, 'jpg*') as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"jpg*"`);
      });

      test('match all fields with value', () => {
        const node = nodeTypes.function.buildNode('is', '*', 200) as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"*: 200"`);
      });

      test('field with match all value"', () => {
        const node = nodeTypes.function.buildNode('is', 'extension', '*') as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"extension: *"`);
      });

      test('field with value', () => {
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg') as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"extension: jpg"`);
      });

      test('field with phrase value', () => {
        const node = nodeTypes.function.buildNode('is', 'extension', '"jpg"') as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"extension: \\"jpg\\""`);
      });

      test('phrase field with phrase value', () => {
        const node = nodeTypes.function.buildNode(
          'is',
          '"extension"',
          '"jpg"'
        ) as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"\\"extension\\": \\"jpg\\""`);
      });

      test('field with wildcard value', () => {
        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg*') as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"extension: jpg*"`);
      });

      test('wildcard field with value', () => {
        const node = nodeTypes.function.buildNode('is', 'ext*', 'jpg') as KqlIsFunctionNode;
        const result = is.toKqlExpression(node);
        expect(result).toMatchInlineSnapshot(`"ext*: jpg"`);
      });
    });
  });
});
