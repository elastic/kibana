/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { tabifyAggResponse } from './tabify';
import { IndexPattern } from '../..';
import { AggConfigs, BucketAggParam, IAggConfig, IAggConfigs } from '../aggs';
import { mockAggTypesRegistry } from '../aggs/test_helpers';
import { metricOnly, threeTermBuckets } from './fixtures/fake_hierarchical_data';

describe('tabifyAggResponse Integration', () => {
  const typesRegistry = mockAggTypesRegistry();

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
    } as unknown as IndexPattern;

    return new AggConfigs(indexPattern, aggs, { typesRegistry });
  };

  const mockAggConfig = (agg: any): IAggConfig => agg as unknown as IAggConfig;

  test('transforms a simple response properly', () => {
    const aggConfigs = createAggConfigs([{ type: 'count' } as any]);

    const resp = tabifyAggResponse(aggConfigs, metricOnly, {
      metricsAtAllLevels: true,
    });

    expect(resp).toHaveProperty('rows');
    expect(resp).toHaveProperty('columns');

    expect(resp.rows).toHaveLength(1);
    expect(resp.columns).toHaveLength(1);

    expect(resp.rows[0]).toEqual({ 'col-0-1': 1000 });
    expect(resp.columns[0]).toHaveProperty('name', aggConfigs.aggs[0].makeLabel());
  });

  describe('scaleMetricValues performance check', () => {
    beforeAll(() => {
      typesRegistry.get('count').params.push({
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

      tabifyAggResponse(aggConfigs, metricOnly, {
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

      tabifyAggResponse(aggConfigs, metricOnly, {
        metricsAtAllLevels: true,
      });
      expect(writeMock).toHaveBeenCalled();
    });
  });

  describe('transforms a complex response', () => {
    let esResp: typeof threeTermBuckets;
    let aggConfigs: IAggConfigs;
    let avg: IAggConfig;
    let ext: IAggConfig;
    let src: IAggConfig;
    let os: IAggConfig;

    beforeEach(() => {
      aggConfigs = createAggConfigs([
        mockAggConfig({ type: 'avg', schema: 'metric', params: { field: '@timestamp' } }),
        mockAggConfig({ type: 'terms', schema: 'split', params: { field: '@timestamp' } }),
        mockAggConfig({ type: 'terms', schema: 'segment', params: { field: '@timestamp' } }),
        mockAggConfig({ type: 'terms', schema: 'segment', params: { field: '@timestamp' } }),
      ]);

      [avg, ext, src, os] = aggConfigs.aggs;

      esResp = threeTermBuckets;
      esResp.aggregations.agg_2.buckets[1].agg_3.buckets[0].agg_4.buckets = [];
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
});
