/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { keyBy } from 'lodash';
import { AggConfig } from './agg_config';
import { AggConfigs } from './agg_configs';
import { AggTypesRegistryStart } from './agg_types_registry';
import { mockAggTypesRegistry } from './test_helpers';
import { IndexPattern } from '../..';
import { stubIndexPattern } from '../../stubs';
import { IEsSearchResponse } from '..';

describe('AggConfigs', () => {
  const indexPattern: IndexPattern = stubIndexPattern;
  let typesRegistry: AggTypesRegistryStart;

  beforeEach(() => {
    typesRegistry = mockAggTypesRegistry();
  });

  describe('constructor', () => {
    it('handles passing just a type', () => {
      const configStates = [
        {
          enabled: true,
          type: 'histogram',
          params: {},
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(ac.aggs).toHaveLength(1);
    });

    it('attempts to ensure that all states have an id', () => {
      const configStates = [
        {
          enabled: true,
          type: 'histogram',
          params: {},
        },
        {
          enabled: true,
          type: 'date_histogram',
          params: {},
        },
        {
          enabled: true,
          type: 'terms',
          params: {},
          schema: 'split',
        },
      ];

      const spy = jest.spyOn(AggConfig, 'ensureIds');
      new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]).toEqual([configStates]);
      spy.mockRestore();
    });
  });

  describe('#createAggConfig', () => {
    it('accepts a configState which is provided as an AggConfig object', () => {
      const configStates = [
        {
          enabled: true,
          type: 'histogram',
          params: {},
        },
        {
          enabled: true,
          type: 'date_histogram',
          params: {},
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(ac.aggs).toHaveLength(2);

      ac.createAggConfig(
        new AggConfig(ac, {
          enabled: true,
          type: typesRegistry.get('terms'),
          params: {},
          schema: 'split',
        })
      );
      expect(ac.aggs).toHaveLength(3);
    });

    it('adds new AggConfig entries to AggConfigs by default', () => {
      const configStates = [
        {
          enabled: true,
          type: 'histogram',
          params: {},
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(ac.aggs).toHaveLength(1);

      ac.createAggConfig({
        enabled: true,
        type: 'terms',
        params: {},
        schema: 'split',
      });
      expect(ac.aggs).toHaveLength(2);
    });

    it('does not add an agg to AggConfigs if addToAggConfigs: false', () => {
      const configStates = [
        {
          enabled: true,
          type: 'histogram',
          params: {},
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(ac.aggs).toHaveLength(1);

      ac.createAggConfig(
        {
          enabled: true,
          type: 'terms',
          params: {},
          schema: 'split',
        },
        { addToAggConfigs: false }
      );
      expect(ac.aggs).toHaveLength(1);
    });

    it(`throws if trying to add an agg which doesn't have a type in the registry`, () => {
      const configStates = [
        {
          enabled: true,
          type: 'histogram',
          params: {},
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(() =>
        ac.createAggConfig({
          enabled: true,
          type: 'oops',
          params: {},
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Unable to find a registered agg type for \\"oops\\"."`
      );
    });
  });

  describe('#getRequestAggs', () => {
    it('performs a stable sort, but moves metrics to the bottom', () => {
      const configStates = [
        { type: 'avg', enabled: true, params: {}, schema: 'metric' },
        { type: 'terms', enabled: true, params: {}, schema: 'split' },
        { type: 'histogram', enabled: true, params: {}, schema: 'split' },
        { type: 'sum', enabled: true, params: {}, schema: 'metric' },
        { type: 'date_histogram', enabled: true, params: {}, schema: 'segment' },
        { type: 'filters', enabled: true, params: {}, schema: 'split' },
        { type: 'percentiles', enabled: true, params: {}, schema: 'metric' },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const sorted = ac.getRequestAggs();
      const aggs = keyBy(ac.aggs, (agg) => agg.type.name);

      expect(sorted.shift()).toBe(aggs.terms);
      expect(sorted.shift()).toBe(aggs.histogram);
      expect(sorted.shift()).toBe(aggs.date_histogram);
      expect(sorted.shift()).toBe(aggs.filters);
      expect(sorted.shift()).toBe(aggs.avg);
      expect(sorted.shift()).toBe(aggs.sum);
      expect(sorted.shift()).toBe(aggs.percentiles);
      expect(sorted).toHaveLength(0);
    });
  });

  describe('#getResponseAggs', () => {
    it('returns all request aggs for basic aggs', () => {
      const configStates = [
        { type: 'terms', enabled: true, params: {}, schema: 'split' },
        { type: 'date_histogram', enabled: true, params: {}, schema: 'segment' },
        { type: 'count', enabled: true, params: {}, schema: 'metric' },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const sorted = ac.getResponseAggs();
      const aggs = keyBy(ac.aggs, (agg) => agg.type.name);

      expect(sorted.shift()).toBe(aggs.terms);
      expect(sorted.shift()).toBe(aggs.date_histogram);
      expect(sorted.shift()).toBe(aggs.count);
      expect(sorted).toHaveLength(0);
    });

    it('expands aggs that have multiple responses', () => {
      const configStates = [
        { type: 'terms', enabled: true, params: {}, schema: 'split' },
        { type: 'date_histogram', enabled: true, params: {}, schema: 'segment' },
        { type: 'percentiles', enabled: true, params: { percents: [1, 2, 3] }, schema: 'metric' },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const sorted = ac.getResponseAggs();
      const aggs = keyBy(ac.aggs, (agg) => agg.type.name);

      expect(sorted.shift()).toBe(aggs.terms);
      expect(sorted.shift()).toBe(aggs.date_histogram);
      expect(sorted.shift()!.id!).toBe(aggs.percentiles.id + '.' + 1);
      expect(sorted.shift()!.id!).toBe(aggs.percentiles.id + '.' + 2);
      expect(sorted.shift()!.id!).toBe(aggs.percentiles.id + '.' + 3);
      expect(sorted).toHaveLength(0);
    });
  });

  describe('#getResponseAggById', () => {
    it('returns aggs by matching id without confusing prefixes', () => {
      const configStates = [
        { id: '1', type: 'terms', enabled: true, params: {}, schema: 'split' },
        { id: '10', type: 'date_histogram', enabled: true, params: {}, schema: 'segment' },
        { id: '101', type: 'count', enabled: true, params: {}, schema: 'metric' },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(ac.getResponseAggById('1')?.type.name).toEqual('terms');
      expect(ac.getResponseAggById('10')?.type.name).toEqual('date_histogram');
      expect(ac.getResponseAggById('101')?.type.name).toEqual('count');
    });

    it('returns right agg for id within a multi-value agg', () => {
      const configStates = [
        { id: '1', type: 'terms', enabled: true, params: {}, schema: 'split' },
        { id: '10', type: 'date_histogram', enabled: true, params: {}, schema: 'segment' },
        {
          id: '101',
          type: 'percentiles',
          enabled: true,
          params: { percents: [1, 10, 3.33] },
          schema: 'metric',
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      expect(ac.getResponseAggById('1')?.type.name).toEqual('terms');
      expect(ac.getResponseAggById('10')?.type.name).toEqual('date_histogram');
      expect(ac.getResponseAggById('101.1')?.type.name).toEqual('percentiles');
      expect(ac.getResponseAggById('101.10')?.type.name).toEqual('percentiles');
      expect(ac.getResponseAggById("101['3.33']")?.type.name).toEqual('percentiles');
    });
  });

  describe('#toDsl', () => {
    it('uses the sorted aggs', () => {
      const configStates = [{ enabled: true, type: 'avg', params: { field: 'bytes' } }];
      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const spy = jest.spyOn(AggConfigs.prototype, 'getRequestAggs');
      ac.toDsl();
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('calls aggConfig#toDsl() on each aggConfig and compiles the nested output', () => {
      const configStates = [
        { enabled: true, type: 'date_histogram', params: {}, schema: 'segment' },
        { enabled: true, type: 'terms', params: {}, schema: 'split' },
        { enabled: true, type: 'count', params: {} },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });

      const aggInfos = ac.aggs.map((aggConfig) => {
        const football = {};
        aggConfig.toDsl = jest.fn().mockImplementation(() => football);

        return {
          id: aggConfig.id,
          football,
        };
      });

      (function recurse(lvl: Record<string, any>): void {
        const info = aggInfos.shift();
        if (!info) return;

        expect(lvl).toHaveProperty(info.id);
        expect(lvl[info.id]).toBe(info.football);

        if (lvl[info.id].aggs) {
          return recurse(lvl[info.id].aggs);
        }
      })(ac.toDsl());

      expect(aggInfos).toHaveLength(1);
    });

    it("skips aggs that don't have a dsl representation", () => {
      const configStates = [
        {
          enabled: true,
          type: 'date_histogram',
          params: { field: '@timestamp', interval: '10s' },
          schema: 'segment',
        },
        {
          enabled: true,
          type: 'count',
          params: {},
          schema: 'metric',
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const dsl = ac.toDsl();
      const histo = ac.byName('date_histogram')[0];
      const count = ac.byName('count')[0];

      expect(dsl).toHaveProperty(histo.id);
      expect(typeof dsl[histo.id]).toBe('object');
      expect(dsl[histo.id]).not.toHaveProperty('aggs');
      expect(dsl).not.toHaveProperty(count.id);
    });

    it('writes multiple metric aggregations at the same level', () => {
      const configStates = [
        {
          enabled: true,
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        { enabled: true, type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'sum', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'min', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'max', schema: 'metric', params: { field: 'bytes' } },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const dsl = ac.toDsl();
      const histo = ac.byName('date_histogram')[0];
      const metrics = ac.bySchemaName('metrics');

      expect(dsl).toHaveProperty(histo.id);
      expect(typeof dsl[histo.id]).toBe('object');
      expect(dsl[histo.id]).toHaveProperty('aggs');

      metrics.forEach((metric) => {
        expect(dsl[histo.id].aggs).toHaveProperty(metric.id);
        expect(dsl[histo.id].aggs[metric.id]).not.toHaveProperty('aggs');
      });
    });

    it('inserts a time split filters agg if there are multiple time shifts', () => {
      const configStates = [
        {
          enabled: true,
          type: 'terms',
          schema: 'segment',
          params: { field: 'clientip', size: 10 },
        },
        { enabled: true, type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        {
          enabled: true,
          type: 'sum',
          schema: 'metric',
          params: { field: 'bytes', timeShift: '1d' },
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      ac.timeFields = ['@timestamp'];
      ac.timeRange = {
        from: '2021-05-05T00:00:00.000Z',
        to: '2021-05-10T00:00:00.000Z',
      };
      const dsl = ac.toDsl();

      const terms = ac.byName('terms')[0];
      const avg = ac.byName('avg')[0];
      const sum = ac.byName('sum')[0];

      expect(dsl[terms.id].aggs.time_offset_split.filters.filters).toMatchInlineSnapshot(`
        Object {
          "0": Object {
            "range": Object {
              "@timestamp": Object {
                "format": "strict_date_optional_time",
                "gte": "2021-05-05T00:00:00.000Z",
                "lte": "2021-05-10T00:00:00.000Z",
              },
            },
          },
          "86400000": Object {
            "range": Object {
              "@timestamp": Object {
                "format": "strict_date_optional_time",
                "gte": "2021-05-04T00:00:00.000Z",
                "lte": "2021-05-09T00:00:00.000Z",
              },
            },
          },
        }
      `);
      expect(dsl[terms.id].aggs.time_offset_split.aggs).toHaveProperty(avg.id);
      expect(dsl[terms.id].aggs.time_offset_split.aggs).toHaveProperty(sum.id);
    });

    it('does not insert a time split if there is a single time shift', () => {
      const configStates = [
        {
          enabled: true,
          type: 'terms',
          schema: 'segment',
          params: { field: 'clientip', size: 10 },
        },
        {
          enabled: true,
          type: 'avg',
          schema: 'metric',
          params: {
            field: 'bytes',
            timeShift: '1d',
          },
        },
        {
          enabled: true,
          type: 'sum',
          schema: 'metric',
          params: { field: 'bytes', timeShift: '1d' },
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      ac.timeFields = ['timestamp'];
      ac.timeRange = {
        from: '2021-05-05T00:00:00.000Z',
        to: '2021-05-10T00:00:00.000Z',
      };
      const dsl = ac.toDsl();

      const terms = ac.byName('terms')[0];
      const avg = ac.byName('avg')[0];
      const sum = ac.byName('sum')[0];

      expect(dsl[terms.id].aggs).not.toHaveProperty('time_offset_split');
      expect(dsl[terms.id].aggs).toHaveProperty(avg.id);
      expect(dsl[terms.id].aggs).toHaveProperty(sum.id);
    });

    it('writes multiple metric aggregations at every level if the vis is hierarchical', () => {
      const configStates = [
        { enabled: true, type: 'terms', schema: 'segment', params: { field: 'bytes', orderBy: 1 } },
        { enabled: true, type: 'terms', schema: 'segment', params: { field: 'bytes', orderBy: 1 } },
        { enabled: true, id: '1', type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'sum', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'min', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'max', schema: 'metric', params: { field: 'bytes' } },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry, hierarchical: true });
      const topLevelDsl = ac.toDsl();
      const buckets = ac.bySchemaName('buckets');
      const metrics = ac.bySchemaName('metrics');

      (function checkLevel(dsl) {
        const bucket = buckets.shift();
        if (!bucket) return;

        expect(dsl).toHaveProperty(bucket.id);

        expect(typeof dsl[bucket.id]).toBe('object');
        expect(dsl[bucket.id]).toHaveProperty('aggs');

        metrics.forEach((metric: AggConfig) => {
          expect(dsl[bucket.id].aggs).toHaveProperty(metric.id);
          expect(dsl[bucket.id].aggs[metric.id]).not.toHaveProperty('aggs');
        });

        if (buckets.length) {
          checkLevel(dsl[bucket.id].aggs);
        }
      })(topLevelDsl);
    });

    it('adds the parent aggs of nested metrics at every level if the vis is hierarchical', () => {
      const configStates = [
        {
          enabled: true,
          id: '1',
          type: 'avg_bucket',
          schema: 'metric',
          params: {
            customBucket: {
              id: '1-bucket',
              type: 'date_histogram',
              schema: 'bucketAgg',
              params: {
                field: '@timestamp',
                interval: '10s',
              },
            },
            customMetric: {
              id: '1-metric',
              type: 'count',
              schema: 'metricAgg',
              params: {},
            },
          },
        },
        {
          enabled: true,
          id: '2',
          type: 'terms',
          schema: 'bucket',
          params: {
            field: 'clientip',
          },
        },
        {
          enabled: true,
          id: '3',
          type: 'terms',
          schema: 'bucket',
          params: {
            field: 'machine.os.raw',
          },
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry, hierarchical: true });
      const topLevelDsl = ac.toDsl()['2'];

      expect(Object.keys(topLevelDsl.aggs)).toContain('1');
      expect(Object.keys(topLevelDsl.aggs)).toContain('1-bucket');
      expect(topLevelDsl.aggs['1'].avg_bucket).toHaveProperty('buckets_path', '1-bucket>_count');
      expect(Object.keys(topLevelDsl.aggs['3'].aggs)).toContain('1');
      expect(Object.keys(topLevelDsl.aggs['3'].aggs)).toContain('1-bucket');
      expect(topLevelDsl.aggs['3'].aggs['1'].avg_bucket).toHaveProperty(
        'buckets_path',
        '1-bucket>_count'
      );
    });
  });

  describe('#postFlightTransform', () => {
    it('merges together splitted responses for multiple shifts', () => {
      const configStates = [
        {
          enabled: true,
          type: 'terms',
          schema: 'segment',
          params: { field: 'clientip', size: 10 },
        },
        {
          enabled: true,
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '1d' },
        },
        {
          enabled: true,
          type: 'avg',
          schema: 'metric',
          params: {
            field: 'bytes',
            timeShift: '1d',
          },
        },
        {
          enabled: true,
          type: 'sum',
          schema: 'metric',
          params: { field: 'bytes' },
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      ac.timeFields = ['@timestamp'];
      ac.timeRange = {
        from: '2021-05-05T00:00:00.000Z',
        to: '2021-05-10T00:00:00.000Z',
      };
      // 1 terms bucket (A), with 2 date buckets (7th and 8th of May)
      // the bucket keys of the shifted time range will be shifted forward
      const response = {
        rawResponse: {
          aggregations: {
            '1': {
              buckets: [
                {
                  key: 'A',
                  time_offset_split: {
                    buckets: {
                      '0': {
                        2: {
                          buckets: [
                            {
                              // 2021-05-07
                              key: 1620345600000,
                              3: {
                                value: 1.1,
                              },
                              4: {
                                value: 2.2,
                              },
                            },
                            {
                              // 2021-05-08
                              key: 1620432000000,
                              doc_count: 26,
                              3: {
                                value: 3.3,
                              },
                              4: {
                                value: 4.4,
                              },
                            },
                          ],
                        },
                      },
                      '86400000': {
                        2: {
                          buckets: [
                            {
                              // 2021-05-07
                              key: 1620345600000,
                              doc_count: 13,
                              3: {
                                value: 5.5,
                              },
                              4: {
                                value: 6.6,
                              },
                            },
                            {
                              // 2021-05-08
                              key: 1620432000000,
                              3: {
                                value: 7.7,
                              },
                              4: {
                                value: 8.8,
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      };
      const mergedResponse = ac.postFlightTransform(response as unknown as IEsSearchResponse<any>);
      expect(mergedResponse.rawResponse).toEqual({
        aggregations: {
          '1': {
            buckets: [
              {
                '2': {
                  buckets: [
                    {
                      '4': {
                        value: 2.2,
                      },
                      // 2021-05-07
                      key: 1620345600000,
                    },
                    {
                      '3': {
                        value: 5.5,
                      },
                      '4': {
                        value: 4.4,
                      },
                      doc_count: 26,
                      doc_count_86400000: 13,
                      // 2021-05-08
                      key: 1620432000000,
                    },
                    {
                      '3': {
                        value: 7.7,
                      },
                      // 2021-05-09
                      key: 1620518400000,
                    },
                  ],
                },
                key: 'A',
              },
            ],
          },
        },
      });
    });

    it('shifts date histogram keys and renames doc_count properties for single shift', () => {
      const configStates = [
        {
          enabled: true,
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '1d' },
        },
        {
          enabled: true,
          type: 'avg',
          schema: 'metric',
          params: {
            field: 'bytes',
            timeShift: '1d',
          },
        },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      ac.timeFields = ['@timestamp'];
      ac.timeRange = {
        from: '2021-05-05T00:00:00.000Z',
        to: '2021-05-10T00:00:00.000Z',
      };
      const response = {
        rawResponse: {
          aggregations: {
            '1': {
              buckets: [
                {
                  // 2021-05-07
                  key: 1620345600000,
                  doc_count: 26,
                  2: {
                    value: 1.1,
                  },
                },
                {
                  // 2021-05-08
                  key: 1620432000000,
                  doc_count: 27,
                  2: {
                    value: 2.2,
                  },
                },
              ],
            },
          },
        },
      };
      const mergedResponse = ac.postFlightTransform(response as unknown as IEsSearchResponse<any>);
      expect(mergedResponse.rawResponse).toEqual({
        aggregations: {
          '1': {
            buckets: [
              {
                '2': {
                  value: 1.1,
                },
                doc_count_86400000: 26,
                // 2021-05-08
                key: 1620432000000,
              },
              {
                '2': {
                  value: 2.2,
                },
                doc_count_86400000: 27,
                // 2021-05-09
                key: 1620518400000,
              },
            ],
          },
        },
      });
    });
  });
});
