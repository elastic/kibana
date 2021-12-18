/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from '../node_types';
import { fields } from '../../filters/stubs';
import { DataViewBase } from '../..';

import * as range from './range';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

jest.mock('../grammar');

describe('kuery functions', () => {
  describe('range', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the provided fieldName as a literal', () => {
        const result = range.buildNodeParams('bytes', 'gt', 1000);
        const {
          arguments: [fieldName],
        } = result;

        expect(fieldName).toHaveProperty('type', 'literal');
        expect(fieldName).toHaveProperty('value', 'bytes');
      });

      test('arguments should contain the provided value as a literal', () => {
        const result = range.buildNodeParams('bytes', 'gt', 1000);
        const {
          arguments: [, , valueArg],
        } = result;

        expect(valueArg).toHaveProperty('type', 'literal');
        expect(valueArg).toHaveProperty('value', 1000);
      });
    });

    describe('toElasticsearchQuery', () => {
      test("should return an ES range query for the node's field and params", () => {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('range', 'bytes', 'gt', 1000);
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should return an ES range query without an index pattern', () => {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', 'bytes', 'gt', 1000);
        const result = range.toElasticsearchQuery(node);

        expect(result).toEqual(expected);
      });

      test('should support wildcard field names', () => {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', 'byt*', 'gt', 1000);
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should support scripted fields', () => {
        const node = nodeTypes.function.buildNode('range', 'script number', 'gt', 1000);
        const result = range.toElasticsearchQuery(node, indexPattern);

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
                    gt: '2018-01-03T19:04:17',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode(
          'range',
          '@timestamp',
          'gt',
          '2018-01-03T19:04:17'
        );
        const result = range.toElasticsearchQuery(node, indexPattern);

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
                    gt: '2018-01-03T19:04:17',
                    time_zone: 'America/Phoenix',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode(
          'range',
          '@timestamp',
          'gt',
          '2018-01-03T19:04:17'
        );
        const result = range.toElasticsearchQuery(node, indexPattern, config);

        expect(result).toEqual(expected);
      });

      test('should use a provided nested context to create a full field name', () => {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  'nestedField.bytes': {
                    gt: 1000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('range', 'bytes', 'gt', 1000);
        const result = range.toElasticsearchQuery(
          node,
          indexPattern,
          {},
          { nested: { path: 'nestedField' } }
        );

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
                    range: {
                      'nestedField.nestedChild.doublyNestedChild': {
                        lt: 8000,
                      },
                    },
                  },
                  score_mode: 'none',
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('range', '*doublyNested*', 'lt', 8000);
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });
    });
  });
});
