/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase } from '../..';
import { fields } from '../../filters/stubs';
import * as range from './range';

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

    describe('buildNode', () => {
      test('arguments should contain the provided fieldName as a literal', () => {
        const result = range.buildNode('bytes', 'gt', 1000);
        const {
          arguments: [fieldName],
        } = result;

        expect(fieldName).toHaveProperty('type', 'literal');
        expect(fieldName).toHaveProperty('value', 'bytes');
      });

      test('arguments should contain the provided value as a literal', () => {
        const result = range.buildNode('bytes', 'gt', 1000);
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
        const node = range.buildNode('bytes', 'gt', 1000);
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

        const node = range.buildNode('bytes', 'gt', 1000);
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

        const node = range.buildNode('byt*', 'gt', 1000);
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });

      test('should support scripted fields', () => {
        const node = range.buildNode('script number', 'gt', 1000);
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result.bool?.should).toMatchInlineSnapshot(`
          Array [
            Object {
              "script": Object {
                "script": Object {
                  "lang": "expression",
                  "params": Object {
                    "gt": 1000,
                  },
                  "source": "(1234)>gt",
                },
              },
            },
          ]
        `);
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
        const node = range.buildNode('@timestamp', 'gt', '2018-01-03T19:04:17');
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
        const node = range.buildNode('@timestamp', 'gt', '2018-01-03T19:04:17');
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
        const node = range.buildNode('bytes', 'gt', 1000);
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
        const node = range.buildNode('*doublyNested*', 'lt', 8000);
        const result = range.toElasticsearchQuery(node, indexPattern);

        expect(result).toEqual(expected);
      });
    });
  });
});
