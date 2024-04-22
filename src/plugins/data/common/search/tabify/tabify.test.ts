/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { tabifyAggResponse } from './tabify';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AggConfigs, BucketAggParam, IAggConfig, IAggConfigs } from '../aggs';
import { mockAggTypesRegistry } from '../aggs/test_helpers';
import { metricOnly, threeTermBuckets } from './fixtures/fake_hierarchical_data';
import { isSamplingEnabled } from '../aggs/utils/sampler';
import { timeOffsetFiltersWithZeroDocCountResponse } from './fixtures/fake_timeoffset_data';

describe('tabifyAggResponse Integration', () => {
  const typesRegistry = mockAggTypesRegistry();

  for (const probability of [1, 0.5, undefined]) {
    function getTitlePostfix() {
      if (probability == null) {
        return '';
      }
      if (probability === 1) {
        return ` - with no sampling (probability = 1)`;
      }
      return ` - with sampling (probability = ${probability})`;
    }

    function enrichResponseWithSampling(response: any) {
      if (!isSamplingEnabled(probability)) {
        return response;
      }
      return {
        ...response,
        aggregations: {
          sampling: {
            ...response.aggregations,
          },
        },
      };
    }

    const createAggConfigs = (aggs: IAggConfig[] = []) => {
      const field = {
        name: '@timestamp',
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
        getFormatterForField: () => ({
          toJSON: () => '{}',
        }),
      } as unknown as DataView;

      return new AggConfigs(indexPattern, aggs, { typesRegistry, probability }, jest.fn());
    };

    const mockAggConfig = (agg: any): IAggConfig => agg as unknown as IAggConfig;

    if (isSamplingEnabled(probability)) {
      test('does not fail if there is no aggregations object when sampling is active', () => {
        const aggConfigs = createAggConfigs([
          mockAggConfig({ type: 'avg', schema: 'metric', params: { field: '@timestamp' } }),
          mockAggConfig({ type: 'terms', schema: 'split', params: { field: '@timestamp' } }),
          mockAggConfig({ type: 'terms', schema: 'segment', params: { field: '@timestamp' } }),
          mockAggConfig({ type: 'terms', schema: 'segment', params: { field: '@timestamp' } }),
        ]);
        const response = enrichResponseWithSampling(metricOnly);

        delete response.aggregations;

        expect(() =>
          tabifyAggResponse(aggConfigs, response, {
            metricsAtAllLevels: true,
          })
        ).not.toThrow();
      });
    }

    test(`transforms a simple response properly${getTitlePostfix()}`, () => {
      const aggConfigs = createAggConfigs([{ type: 'count' } as any]);

      const resp = tabifyAggResponse(aggConfigs, enrichResponseWithSampling(metricOnly), {
        metricsAtAllLevels: true,
      });

      expect(resp).toHaveProperty('rows');
      expect(resp).toHaveProperty('columns');

      expect(resp.rows).toHaveLength(1);
      expect(resp.columns).toHaveLength(1);

      expect(resp.rows[0]).toEqual({ 'col-0-1': 1000 });
      expect(resp.columns[0]).toHaveProperty('name', aggConfigs.aggs[0].makeLabel());

      expect(resp).toHaveProperty('meta.type', 'esaggs');
      expect(resp).toHaveProperty('meta.source', '1234');
      expect(resp).toHaveProperty('meta.statistics.totalCount', 1000);
    });

    describe(`scaleMetricValues performance check${getTitlePostfix()}`, () => {
      beforeAll(() => {
        typesRegistry.get('count')!.params.push({
          name: 'scaleMetricValues',
          default: false,
          write: () => {},
          advanced: true,
        } as any as BucketAggParam<any>);
      });
      test('does not call write if scaleMetricValues is not set', () => {
        const aggConfigs = createAggConfigs([{ type: 'count' } as any]);

        const writeMock = jest.fn();
        aggConfigs.getRequestAggs()[0].write = writeMock;

        tabifyAggResponse(aggConfigs, enrichResponseWithSampling(metricOnly), {
          metricsAtAllLevels: true,
        });
        expect(writeMock).not.toHaveBeenCalled();
      });

      test('does call write if scaleMetricValues is set', () => {
        const aggConfigs = createAggConfigs([
          { type: 'count', params: { scaleMetricValues: true } } as any,
        ]);

        const writeMock = jest.fn(() => ({}));
        aggConfigs.getRequestAggs()[0].write = writeMock;

        tabifyAggResponse(aggConfigs, enrichResponseWithSampling(metricOnly), {
          metricsAtAllLevels: true,
        });
        expect(writeMock).toHaveBeenCalled();
      });
    });

    describe(`transforms a complex response${getTitlePostfix()}`, () => {
      let esResp: typeof threeTermBuckets;
      let aggConfigs: IAggConfigs;
      let avg: IAggConfig;
      let ext: IAggConfig;
      let src: IAggConfig;
      let os: IAggConfig;

      function getTopAggregations(
        rawResp: typeof threeTermBuckets
      ): typeof threeTermBuckets['aggregations'] {
        return !isSamplingEnabled(probability)
          ? rawResp.aggregations!
          : // @ts-ignore
            rawResp.aggregations!.sampling!;
      }

      beforeEach(() => {
        aggConfigs = createAggConfigs([
          mockAggConfig({ type: 'avg', schema: 'metric', params: { field: '@timestamp' } }),
          mockAggConfig({ type: 'terms', schema: 'split', params: { field: '@timestamp' } }),
          mockAggConfig({ type: 'terms', schema: 'segment', params: { field: '@timestamp' } }),
          mockAggConfig({ type: 'terms', schema: 'segment', params: { field: '@timestamp' } }),
        ]);

        [avg, ext, src, os] = aggConfigs.aggs;

        esResp = enrichResponseWithSampling(threeTermBuckets);
        getTopAggregations(esResp).agg_2.buckets[1].agg_3.buckets[0].agg_4.buckets = [];
      });

      // check that the columns of a table are formed properly
      function expectColumns(table: ReturnType<typeof tabifyAggResponse>, aggs: IAggConfig[]) {
        expect(table.columns).toHaveLength(aggs.length);

        aggs.forEach((agg, i) => {
          expect(table.columns[i]).toHaveProperty('name', agg.makeLabel());
        });
      }

      // check that a row has expected values
      function expectRow(
        row: Record<string, string | number>,
        asserts: Array<(val: string | number) => void>
      ) {
        expect(typeof row).toBe('object');

        asserts.forEach((assert, i: number) => {
          if (row[`col-${i}`]) {
            assert(row[`col-${i}`]);
          }
        });
      }

      // check for two character country code
      function expectCountry(val: string | number) {
        expect(typeof val).toBe('string');
        expect(val).toHaveLength(2);
      }

      // check for an OS term
      function expectExtension(val: string | number) {
        expect(val).toMatch(/^(js|png|html|css|jpg)$/);
      }

      // check for an OS term
      function expectOS(val: string | number) {
        expect(val).toMatch(/^(win|mac|linux)$/);
      }

      // check for something like an average bytes result
      function expectAvgBytes(val: string | number) {
        expect(typeof val).toBe('number');
        expect(val === 0 || val > 1000).toBeDefined();
      }

      test('for non-hierarchical vis', () => {
        // the default for a non-hierarchical vis is to display
        // only complete rows, and only put the metrics at the end.

        const tabbed = tabifyAggResponse(aggConfigs, esResp, { metricsAtAllLevels: false });

        expectColumns(tabbed, [ext, src, os, avg]);

        tabbed.rows.forEach((row) => {
          expectRow(row, [expectExtension, expectCountry, expectOS, expectAvgBytes]);
        });
      });

      test('for hierarchical vis', () => {
        const tabbed = tabifyAggResponse(aggConfigs, esResp, { metricsAtAllLevels: true });

        expectColumns(tabbed, [ext, avg, src, avg, os, avg]);

        tabbed.rows.forEach((row) => {
          expectRow(row, [
            expectExtension,
            expectAvgBytes,
            expectCountry,
            expectAvgBytes,
            expectOS,
            expectAvgBytes,
          ]);
        });
      });
    });

    describe(`edge cases${getTitlePostfix()}`, () => {
      test('it should correctly report zero doc count for unshifted bucket', () => {
        const aggConfigs = createAggConfigs([
          mockAggConfig({ type: 'count', schema: 'metric' }),
          mockAggConfig({ type: 'count', schema: 'metric', params: { timeShift: '1d' } }),
        ]);

        // no need to wrap with sampling as count is not affected by it
        const tabbed = tabifyAggResponse(aggConfigs, timeOffsetFiltersWithZeroDocCountResponse, {
          metricsAtAllLevels: false,
        });
        expect(tabbed.rows[0]).toEqual({ 'col-0-1': 0, 'col-1-2': 234 });
      });
    });
  }
});
