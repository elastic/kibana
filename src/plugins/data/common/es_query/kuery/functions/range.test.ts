/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { nodeTypes } from '../node_types';
import { fields } from '../../../index_patterns/mocks';
import { IIndexPattern } from '../../../index_patterns';
import { RangeFilterParams } from '../../filters';

// @ts-ignore
import * as range from './range';

describe('kuery functions', () => {
  describe('range', () => {
    let indexPattern: IIndexPattern;

    beforeEach(() => {
      indexPattern = ({
        fields,
      } as unknown) as IIndexPattern;
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the provided fieldName as a literal', () => {
        const result = range.buildNodeParams('bytes', { gt: 1000, lt: 8000 });
        const {
          arguments: [fieldName],
        } = result;

        expect(fieldName).toHaveProperty('type', 'literal');
        expect(fieldName).toHaveProperty('value', 'bytes');
      });

      test('arguments should contain the provided params as named arguments', () => {
        const givenParams: RangeFilterParams = { gt: 1000, lt: 8000, format: 'epoch_millis' };
        const result = range.buildNodeParams('bytes', givenParams);
        const {
          arguments: [, ...params],
        } = result;

        expect(Array.isArray(params)).toBeTruthy();
        expect(params.length).toBeGreaterThan(1);

        params.map((param: any) => {
          expect(param).toHaveProperty('type', 'namedArg');
          expect(['gt', 'lt', 'format'].includes(param.name)).toBe(true);
          expect(param.value.type).toBe('literal');
          expect(param.value.value).toBe(get(givenParams, param.name));
        });
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
                    lt: 8000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 });
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
                    lt: 8000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 });
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
                    lt: 8000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', 'byt*', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should support scripted fields', () => {
        const node = nodeTypes.function.buildNode('range', 'script number', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result.bool.should[0]).toHaveProperty('script');
      });

      test('should support date fields without a dateFormat provided', () => {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  '@timestamp': {
                    gt: '2018-01-03T19:04:17',
                    lt: '2018-04-03T19:04:17',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('range', '@timestamp', {
          gt: '2018-01-03T19:04:17',
          lt: '2018-04-03T19:04:17',
        });
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
                    lt: '2018-04-03T19:04:17',
                    time_zone: 'America/Phoenix',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('range', '@timestamp', {
          gt: '2018-01-03T19:04:17',
          lt: '2018-04-03T19:04:17',
        });
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
                    lt: 8000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        const node = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 });
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
                        gt: 1000,
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
        const node = nodeTypes.function.buildNode('range', '*doublyNested*', {
          gt: 1000,
          lt: 8000,
        });
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });
    });
  });
});
