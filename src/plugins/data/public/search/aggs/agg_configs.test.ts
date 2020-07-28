/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { keyBy } from 'lodash';
import { AggConfig } from './agg_config';
import { AggConfigs } from './agg_configs';
import { AggTypesRegistryStart } from './agg_types_registry';
import { mockAggTypesRegistry } from './test_helpers';
import { Field as IndexPatternField, IndexPattern } from '../../index_patterns';
import { stubIndexPattern, stubIndexPatternWithFields } from '../../../public/stubs';

describe('AggConfigs', () => {
  let indexPattern: IndexPattern;
  let typesRegistry: AggTypesRegistryStart;

  beforeEach(() => {
    indexPattern = stubIndexPatternWithFields as IndexPattern;
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

  describe('#toDsl', () => {
    beforeEach(() => {
      indexPattern = stubIndexPattern as IndexPattern;
      indexPattern.fields.getByName = (name) => (name as unknown) as IndexPatternField;
    });

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

    it('writes multiple metric aggregations at every level if the vis is hierarchical', () => {
      const configStates = [
        { enabled: true, type: 'terms', schema: 'segment', params: { field: 'bytes', orderBy: 1 } },
        { enabled: true, type: 'terms', schema: 'segment', params: { field: 'bytes', orderBy: 1 } },
        { enabled: true, id: '1', type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'sum', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'min', schema: 'metric', params: { field: 'bytes' } },
        { enabled: true, type: 'max', schema: 'metric', params: { field: 'bytes' } },
      ];

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const topLevelDsl = ac.toDsl(true);
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

      const ac = new AggConfigs(indexPattern, configStates, { typesRegistry });
      const topLevelDsl = ac.toDsl(true)['2'];

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
});
