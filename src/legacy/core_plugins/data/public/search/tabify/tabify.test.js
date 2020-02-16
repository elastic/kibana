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

import fixtures from 'fixtures/fake_hierarchical_data';
import { cloneDeep } from 'lodash';
import { tabifyAggResponse } from './tabify';
import { AggConfigs, AggGroupNames, Schemas } from '../aggs';

jest.mock('ui/new_platform');

describe('tabifyAggResponse Integration', () => {
  const createAggConfigs = (aggs = []) => {
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
    };

    return new AggConfigs(
      indexPattern,
      aggs,
      new Schemas([
        {
          group: AggGroupNames.Metrics,
          name: 'metric',
          min: 1,
          defaults: [{ schema: 'metric', type: 'count' }],
        },
      ]).all
    );
  };

  test('transforms a simple response properly', () => {
    const aggConfigs = createAggConfigs();

    const resp = tabifyAggResponse(aggConfigs, fixtures.metricOnly, {
      metricsAtAllLevels: true,
    });

    expect(resp).toHaveProperty('rows');
    expect(resp).toHaveProperty('columns');

    expect(resp.rows).toHaveLength(1);
    expect(resp.columns).toHaveLength(1);

    expect(resp.rows[0]).toEqual({ 'col-0-1': 1000 });
    expect(resp.columns[0]).toHaveProperty('aggConfig', aggConfigs.aggs[0]);
  });

  describe('transforms a complex response', () => {
    let avg;
    let ext;
    let src;
    let os;
    let esResp;
    let aggConfigs;

    beforeEach(() => {
      aggConfigs = createAggConfigs([
        { type: 'avg', schema: 'metric', params: { field: '@timestamp' } },
        { type: 'terms', schema: 'split', params: { field: '@timestamp' } },
        { type: 'terms', schema: 'segment', params: { field: '@timestamp' } },
        { type: 'terms', schema: 'segment', params: { field: '@timestamp' } },
      ]);

      avg = aggConfigs.aggs[0];
      ext = aggConfigs.aggs[1];
      src = aggConfigs.aggs[2];
      os = aggConfigs.aggs[3];

      esResp = cloneDeep(fixtures.threeTermBuckets);
      // remove the buckets for css              in MX
      esResp.aggregations.agg_2.buckets[1].agg_3.buckets[0].agg_4.buckets = [];
    });

    // check that the columns of a table are formed properly
    function expectColumns(table, aggs) {
      expect(table.columns).toHaveLength(aggs.length);

      aggs.forEach(function(agg, i) {
        expect(table.columns[i]).toHaveProperty('aggConfig', agg);
      });
    }

    // check that a row has expected values
    function expectRow(row, asserts) {
      expect(typeof row).toBe('object');

      asserts.forEach(function(assert, i) {
        if (row[`col-${i}`]) {
          assert(row[`col-${i}`]);
        }
      });
    }

    // check for two character country code
    function expectCountry(val) {
      expect(typeof val).toBe('string');
      expect(val).toHaveLength(2);
    }

    // check for an OS term
    function expectExtension(val) {
      expect(val).toMatch(/^(js|png|html|css|jpg)$/);
    }

    // check for an OS term
    function expectOS(val) {
      expect(val).toMatch(/^(win|mac|linux)$/);
    }

    // check for something like an average bytes result
    function expectAvgBytes(val) {
      expect(typeof val).toBe('number');
      expect(val === 0 || val > 1000).toBeDefined();
    }

    test('for non-hierarchical vis', () => {
      // the default for a non-hierarchical vis is to display
      // only complete rows, and only put the metrics at the end.

      const tabbed = tabifyAggResponse(aggConfigs, esResp, { metricsAtAllLevels: false });

      expectColumns(tabbed, [ext, src, os, avg]);

      tabbed.rows.forEach(row => {
        expectRow(row, [expectExtension, expectCountry, expectOS, expectAvgBytes]);
      });
    });

    test('for hierarchical vis', () => {
      const tabbed = tabifyAggResponse(aggConfigs, esResp, { metricsAtAllLevels: true });

      expectColumns(tabbed, [ext, avg, src, avg, os, avg]);

      tabbed.rows.forEach(row => {
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
