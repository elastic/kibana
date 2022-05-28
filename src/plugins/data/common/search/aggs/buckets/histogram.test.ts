/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry, mockAggTypesDependencies } from '../test_helpers';
import { AggTypesDependencies } from '../agg_types';
import { BUCKET_TYPES } from './bucket_agg_types';
import { IBucketHistogramAggConfig, getHistogramBucketAgg, AutoBounds } from './histogram';
import { BucketAggType } from './bucket_agg_type';
import { SerializableRecord } from '@kbn/utility-types';

describe('Histogram Agg', () => {
  let aggTypesDependencies: AggTypesDependencies;

  beforeEach(() => {
    aggTypesDependencies = { ...mockAggTypesDependencies };
  });

  const getAggConfigs = (params: Record<string, any>) => {
    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
    } as any;

    const field = {
      name: 'field',
      indexPattern,
    };

    return new AggConfigs(
      indexPattern,
      [
        {
          id: 'test',
          type: BUCKET_TYPES.HISTOGRAM,
          schema: 'segment',
          params,
        },
      ],
      {
        typesRegistry: mockAggTypesRegistry(aggTypesDependencies),
      }
    );
  };

  const getParams = (options: Record<string, any>) => {
    const aggConfigs = getAggConfigs({
      ...options,
      field: {
        name: 'field',
      },
    });
    return aggConfigs.aggs[0].toDsl()[BUCKET_TYPES.HISTOGRAM];
  };

  test('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs({
      intervalBase: 100,
      field: {
        name: 'field',
      },
    });
    expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "autoExtendBounds": Array [
                false,
              ],
              "enabled": Array [
                true,
              ],
              "extended_bounds": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "max": Array [
                          "",
                        ],
                        "min": Array [
                          "",
                        ],
                      },
                      "function": "extendedBounds",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
              "field": Array [
                "field",
              ],
              "has_extended_bounds": Array [
                false,
              ],
              "id": Array [
                "test",
              ],
              "interval": Array [
                "auto",
              ],
              "intervalBase": Array [
                100,
              ],
              "min_doc_count": Array [
                false,
              ],
              "schema": Array [
                "segment",
              ],
            },
            "function": "aggHistogram",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  test('preserves interval type when generating AST', () => {
    const aggConfigs = getAggConfigs({
      interval: 1000,
      field: {
        name: 'field',
      },
    });
    const aggConfigs2 = getAggConfigs({
      interval: 'auto',
      field: {
        name: 'field',
      },
    });

    expect(aggConfigs.aggs[0].toExpressionAst()?.chain[0].arguments.interval)
      .toMatchInlineSnapshot(`
      Array [
        1000,
      ]
    `);
    expect(aggConfigs2.aggs[0].toExpressionAst()?.chain[0].arguments.interval)
      .toMatchInlineSnapshot(`
      Array [
        "auto",
      ]
    `);
  });
  describe('ordered', () => {
    let histogramType: BucketAggType<IBucketHistogramAggConfig>;

    beforeEach(() => {
      histogramType = getHistogramBucketAgg(aggTypesDependencies);
    });

    test('is ordered', () => {
      expect(histogramType.ordered).toBeDefined();
    });

    test('is not ordered by date', () => {
      expect(histogramType.ordered).not.toHaveProperty('date');
    });
  });

  describe('params', () => {
    describe('intervalBase', () => {
      test('should not be written to the DSL', () => {
        const aggConfigs = getAggConfigs({
          intervalBase: 100,
          field: {
            name: 'field',
          },
        });
        const { [BUCKET_TYPES.HISTOGRAM]: params } = aggConfigs.aggs[0].toDsl();

        expect(params).not.toHaveProperty('intervalBase');
      });
    });

    describe('maxBars', () => {
      test('should not be written to the DSL', () => {
        const aggConfigs = getAggConfigs({
          maxBars: 50,
          field: {
            name: 'field',
          },
        });
        const { [BUCKET_TYPES.HISTOGRAM]: params } = aggConfigs.aggs[0].toDsl();

        expect(params).not.toHaveProperty('maxBars');
      });
    });

    describe('interval', () => {
      test('accepts "auto" value', () => {
        const params = getParams({
          interval: 'auto',
        });

        expect(params).toHaveProperty('interval', 1);
      });
      test('accepts a whole number', () => {
        const params = getParams({
          interval: 100,
        });

        expect(params).toHaveProperty('interval', 100);
      });

      test('accepts a decimal number', () => {
        const params = getParams({
          interval: 0.1,
        });

        expect(params).toHaveProperty('interval', 0.1);
      });

      test('accepts a decimal number string', () => {
        const params = getParams({
          interval: '0.1',
        });

        expect(params).toHaveProperty('interval', 0.1);
      });

      test('accepts a whole number string', () => {
        const params = getParams({
          interval: '10',
        });

        expect(params).toHaveProperty('interval', 10);
      });

      test('fails on non-numeric values', () => {
        const params = getParams({
          interval: [],
        });

        expect(params.interval).toBeNaN();
      });

      test('will serialize the auto interval along with the actually chosen interval and deserialize correctly', () => {
        const aggConfigs = getAggConfigs({
          interval: 'auto',
          field: {
            name: 'field',
          },
        });
        (aggConfigs.aggs[0] as IBucketHistogramAggConfig).setAutoBounds({ min: 0, max: 1000 });
        const serializedAgg = aggConfigs.aggs[0].serialize();
        const serializedIntervalParam = (serializedAgg.params as SerializableRecord).used_interval;
        expect(serializedIntervalParam).toBe(500);
        const freshHistogramAggConfig = getAggConfigs({
          interval: 100,
          field: {
            name: 'field',
          },
        }).aggs[0];
        freshHistogramAggConfig.setParams(serializedAgg.params);
        expect(freshHistogramAggConfig.getParam('interval')).toEqual('auto');
      });

      describe('interval scaling', () => {
        const getInterval = (
          maxBars: number,
          params?: Record<string, any>,
          autoBounds?: AutoBounds
        ) => {
          aggTypesDependencies = {
            ...aggTypesDependencies,
            getConfig: () => maxBars as any,
          };

          const aggConfigs = getAggConfigs({
            ...params,
            field: {
              name: 'field',
            },
          });
          const aggConfig = aggConfigs.aggs[0] as IBucketHistogramAggConfig;

          if (autoBounds) {
            aggConfig.setAutoBounds(autoBounds);
          }

          return aggConfig.write(aggConfigs).params;
        };

        test('will respect the histogram:maxBars setting', () => {
          const params = getInterval(
            5,
            { interval: 5 },
            {
              min: 0,
              max: 10000,
            }
          );

          expect(params).toHaveProperty('interval', 2000);
        });

        test('will return specified interval, if bars are below histogram:maxBars config', () => {
          const params = getInterval(100, { interval: 5 });

          expect(params).toHaveProperty('interval', 5);
        });

        test('will set to intervalBase if interval is below base', () => {
          const params = getInterval(1000, { interval: 3, intervalBase: 8 });

          expect(params).toHaveProperty('interval', 8);
        });

        test('will round to nearest intervalBase multiple if interval is above base', () => {
          const roundUp = getInterval(1000, { interval: 46, intervalBase: 10 });
          expect(roundUp).toHaveProperty('interval', 50);

          const roundDown = getInterval(1000, { interval: 43, intervalBase: 10 });
          expect(roundDown).toHaveProperty('interval', 40);
        });

        test('will not change interval if it is a multiple of base', () => {
          const output = getInterval(1000, { interval: 35, intervalBase: 5 });

          expect(output).toHaveProperty('interval', 35);
        });

        test('will round to intervalBase after scaling histogram:maxBars', () => {
          const output = getInterval(100, { interval: 5, intervalBase: 6 }, { min: 0, max: 1000 });

          // 100 buckets in 0 to 1000 would result in an interval of 10, so we should
          // round to the next multiple of 6 -> 12
          expect(output).toHaveProperty('interval', 12);
        });
      });

      describe('min_doc_count', () => {
        let output: Record<string, any>;

        test('casts true values to 0', () => {
          output = getParams({ min_doc_count: true });
          expect(output).toHaveProperty('min_doc_count', 0);

          output = getParams({ min_doc_count: 'yes' });
          expect(output).toHaveProperty('min_doc_count', 0);

          output = getParams({ min_doc_count: 1 });
          expect(output).toHaveProperty('min_doc_count', 0);

          output = getParams({ min_doc_count: {} });
          expect(output).toHaveProperty('min_doc_count', 0);
        });

        test('writes 1 for falsy values', () => {
          output = getParams({ min_doc_count: '' });
          expect(output).toHaveProperty('min_doc_count', 1);

          output = getParams({ min_doc_count: null });
          expect(output).toHaveProperty('min_doc_count', 1);

          output = getParams({ min_doc_count: undefined });
          expect(output).toHaveProperty('min_doc_count', 1);
        });
      });

      describe('extended_bounds', () => {
        test('does not write when only eb.min is set', () => {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: { min: 0 },
          });
          expect(output).not.toHaveProperty('extended_bounds');
        });

        test('does not write when only eb.max is set', () => {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: { max: 0 },
          });

          expect(output).not.toHaveProperty('extended_bounds');
        });

        test('writes when both eb.min and eb.max are set', () => {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: { min: 99, max: 100 },
          });

          expect(output.extended_bounds).toHaveProperty('min', 99);
          expect(output.extended_bounds).toHaveProperty('max', 100);
        });

        test('writes when auto bounds and autoExtendBounds are set', () => {
          const aggConfigs = getAggConfigs({
            autoExtendBounds: true,
            field: {
              name: 'field',
            },
          });
          (aggConfigs.aggs[0] as IBucketHistogramAggConfig).setAutoBounds({ min: 0, max: 1000 });
          const output = aggConfigs.aggs[0].toDsl()[BUCKET_TYPES.HISTOGRAM];

          expect(output.extended_bounds).toHaveProperty('min', 0);
          expect(output.extended_bounds).toHaveProperty('max', 1000);
        });

        test('does not write when nothing is set', () => {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: {},
          });

          expect(output).not.toHaveProperty('extended_bounds');
        });

        test('does not write when has_extended_bounds is false', () => {
          const output = getParams({
            has_extended_bounds: false,
            extended_bounds: { min: 99, max: 100 },
          });

          expect(output).not.toHaveProperty('extended_bounds');
        });
      });
    });
  });
});
