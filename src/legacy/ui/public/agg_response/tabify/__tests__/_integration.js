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

import _ from 'lodash';
import fixtures from 'fixtures/fake_hierarchical_data';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { tabifyAggResponse } from '../tabify';
import { start as visualizationsStart } from '../../../../../core_plugins/visualizations/public/np_ready/public/legacy';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('tabifyAggResponse Integration', function() {
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    })
  );

  function normalizeIds(vis) {
    vis.aggs.aggs.forEach(function(agg, i) {
      agg.id = 'agg_' + (i + 1);
    });
  }

  it('transforms a simple response properly', function() {
    const vis = new visualizationsStart.Vis(indexPattern, {
      type: 'histogram',
      aggs: [],
    });
    normalizeIds(vis);

    const resp = tabifyAggResponse(vis.getAggConfig(), fixtures.metricOnly, {
      metricsAtAllLevels: vis.isHierarchical(),
    });

    expect(resp)
      .to.have.property('rows')
      .and.property('columns');
    expect(resp.rows).to.have.length(1);
    expect(resp.columns).to.have.length(1);

    expect(resp.rows[0]).to.eql({ 'col-0-agg_1': 1000 });
    expect(resp.columns[0]).to.have.property('aggConfig', vis.aggs[0]);
  });

  describe('transforms a complex response', function() {
    this.slow(1000);

    let vis;
    let avg;
    let ext;
    let src;
    let os;
    let esResp;

    beforeEach(function() {
      vis = new visualizationsStart.Vis(indexPattern, {
        type: 'pie',
        aggs: [
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          { type: 'terms', schema: 'split', params: { field: 'extension' } },
          { type: 'terms', schema: 'segment', params: { field: 'geo.src' } },
          { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
        ],
      });
      normalizeIds(vis);

      avg = vis.aggs[0];
      ext = vis.aggs[1];
      src = vis.aggs[2];
      os = vis.aggs[3];

      esResp = _.cloneDeep(fixtures.threeTermBuckets);
      // remove the buckets for css              in MX
      esResp.aggregations.agg_2.buckets[1].agg_3.buckets[0].agg_4.buckets = [];
    });

    // check that the columns of a table are formed properly
    function expectColumns(table, aggs) {
      expect(table.columns)
        .to.be.an('array')
        .and.have.length(aggs.length);
      aggs.forEach(function(agg, i) {
        expect(table.columns[i]).to.have.property('aggConfig', agg);
      });
    }

    // check that a row has expected values
    function expectRow(row, asserts) {
      expect(row).to.be.an('object');
      asserts.forEach(function(assert, i) {
        if (row[`col-${i}`]) {
          assert(row[`col-${i}`]);
        }
      });
    }

    // check for two character country code
    function expectCountry(val) {
      expect(val).to.be.a('string');
      expect(val).to.have.length(2);
    }

    // check for an OS term
    function expectExtension(val) {
      expect(val).to.match(/^(js|png|html|css|jpg)$/);
    }

    // check for an OS term
    function expectOS(val) {
      expect(val).to.match(/^(win|mac|linux)$/);
    }

    // check for something like an average bytes result
    function expectAvgBytes(val) {
      expect(val).to.be.a('number');
      expect(val === 0 || val > 1000).to.be.ok();
    }

    it('for non-hierarchical vis', function() {
      // the default for a non-hierarchical vis is to display
      // only complete rows, and only put the metrics at the end.

      const tabbed = tabifyAggResponse(vis.getAggConfig(), esResp, { metricsAtAllLevels: false });

      expectColumns(tabbed, [ext, src, os, avg]);

      tabbed.rows.forEach(function(row) {
        expectRow(row, [expectExtension, expectCountry, expectOS, expectAvgBytes]);
      });
    });

    it('for hierarchical vis', function() {
      // since we have partialRows we expect that one row will have some empty
      // values, and since the vis is hierarchical and we are NOT using
      // minimalColumns we should expect the partial row to be completely after
      // the existing bucket and it's metric

      vis.isHierarchical = _.constant(true);
      const tabbed = tabifyAggResponse(vis.getAggConfig(), esResp, { metricsAtAllLevels: true });

      expectColumns(tabbed, [ext, avg, src, avg, os, avg]);

      tabbed.rows.forEach(function(row) {
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
