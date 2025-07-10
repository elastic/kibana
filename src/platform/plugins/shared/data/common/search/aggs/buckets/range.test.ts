/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import { FieldFormatsGetConfigFn, NumberFormat } from '@kbn/field-formats-plugin/common';
import { RangeKey } from './range_key';

describe('Range Agg', () => {
  describe('RangeKey', () => {
    const label = 'some label';
    describe.each([
      ['open range', {}, undefined],
      ['open upper range', { from: 0 }, undefined],
      ['open lower range', { to: 100 }, undefined],
      ['fully closed range', { from: 0, to: 100 }, undefined],
      ['open range', {}, [{ label }]],
      ['open upper range w/ label', { from: 0 }, [{ from: 0, label }]],
      ['open lower range w/ label', { to: 100 }, [{ to: 100, label }]],
      ['fully closed range w/ label', { from: 0, to: 100 }, [{ from: 0, to: 100, label }]],
    ])('%s', (_, bucket: any, ranges) => {
      const initial = new RangeKey(bucket, ranges);

      test('should correctly set gte', () => {
        expect(initial.gte).toBe(bucket?.from == null ? -Infinity : bucket.from);
      });

      test('should correctly set lt', () => {
        expect(initial.lt).toBe(bucket?.to == null ? Infinity : bucket.to);
      });

      test('should correctly set label', () => {
        expect(initial.label).toBe(ranges?.[0]?.label);
      });

      test('should correctly stringify field', () => {
        expect(initial.toString()).toMatchSnapshot();
      });
    });
  });

  describe('#fromString', () => {
    test.each([
      ['empty range', '', {}],
      ['bad buckets', 'from:baddd,to:baddd', {}],
      ['open range', 'from:undefined,to:undefined', {}],
      ['open upper range', 'from:0,to:undefined', { from: 0 }],
      ['open lower range', 'from:undefined,to:100', { to: 100 }],
      ['fully closed range', 'from:0,to:100', { from: 0, to: 100 }],
      ['mixed closed range', 'from:-100,to:100', { from: -100, to: 100 }],
      ['mixed open range', 'from:-100,to:undefined', { from: -100 }],
      ['negative closed range', 'from:-100,to:-50', { from: -100, to: -50 }],
      ['negative open range', 'from:undefined,to:-50', { to: -50 }],
    ])('should correctly build RangeKey from string for %s', (_, rangeString, bucket) => {
      const expected = new RangeKey(bucket);

      expect(RangeKey.fromString(rangeString).toString()).toBe(expected.toString());
    });
  });

  describe('RangeKey with getAggConfigs', () => {
    const getConfig = (() => {}) as FieldFormatsGetConfigFn;
    const getAggConfigs = () => {
      const field = {
        name: 'bytes',
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
        getFormatterForField: () =>
          new NumberFormat(
            {
              pattern: '0,0.[000] b',
            },
            getConfig
          ),
      } as any;

      return new AggConfigs(
        indexPattern,
        [
          {
            type: BUCKET_TYPES.RANGE,
            schema: 'segment',
            params: {
              field: 'bytes',
              ranges: [
                { from: 0, to: 1000 },
                { from: 1000, to: 2000 },
              ],
            },
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry(),
        },
        jest.fn()
      );
    };

    test('produces the expected expression ast', () => {
      const aggConfigs = getAggConfigs();
      expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "enabled": Array [
                true,
              ],
              "field": Array [
                "bytes",
              ],
              "id": Array [
                "1",
              ],
              "ranges": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "from": Array [
                          0,
                        ],
                        "to": Array [
                          1000,
                        ],
                      },
                      "function": "numericalRange",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "from": Array [
                          1000,
                        ],
                        "to": Array [
                          2000,
                        ],
                      },
                      "function": "numericalRange",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
              "schema": Array [
                "segment",
              ],
            },
            "function": "aggRange",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
    });

    describe('getSerializedFormat', () => {
      test('generates a serialized field format in the expected shape', () => {
        const aggConfigs = getAggConfigs();
        const agg = aggConfigs.aggs[0];
        expect(agg.type.getSerializedFormat(agg)).toMatchInlineSnapshot(`
          Object {
            "id": "range",
            "params": Object {
              "id": "number",
              "params": Object {
                "pattern": "0,0.[000] b",
              },
            },
          }
        `);
      });
    });
  });
});
