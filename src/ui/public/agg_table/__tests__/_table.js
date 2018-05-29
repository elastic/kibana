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
import $ from 'jquery';
import moment from 'moment';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import fixtures from 'fixtures/fake_hierarchical_data';
import sinon from 'sinon';
import { tabifyAggResponse } from '../../agg_response/tabify/tabify';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VisProvider } from '../../vis';
describe('AggTable Directive', function () {

  let $rootScope;
  let $compile;
  let Vis;
  let indexPattern;
  let settings;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private, config) {
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    Vis = Private(VisProvider);
    settings = config;

    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
  }));

  let $scope;
  beforeEach(function () {
    $scope = $rootScope.$new();
  });
  afterEach(function () {
    $scope.$destroy();
  });


  it('renders a simple response properly', function () {
    const vis = new Vis(indexPattern, 'table');
    $scope.table = tabifyAggResponse(
      vis.getAggConfig().getResponseAggs(),
      fixtures.metricOnly,
      { canSplit: false, hierarchical: vis.isHierarchical() }
    );

    const $el = $compile('<kbn-agg-table table="table"></kbn-agg-table>')($scope);
    $scope.$digest();

    expect($el.find('tbody').length).to.be(1);
    expect($el.find('td').length).to.be(1);
    expect($el.find('td').text()).to.eql(1000);
  });

  it('renders nothing if the table is empty', function () {
    $scope.table = null;
    const $el = $compile('<kbn-agg-table table="table"></kbn-agg-table>')($scope);
    $scope.$digest();

    expect($el.find('tbody').length).to.be(0);
  });

  it('renders a complex response properly', function () {
    const vis = new Vis(indexPattern, {
      type: 'pie',
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'terms', schema: 'split', params: { field: 'extension' } },
        { type: 'terms', schema: 'segment', params: { field: 'geo.src' } },
        { type: 'terms', schema: 'segment', params: { field: 'machine.os' } }
      ]
    });
    vis.aggs.forEach(function (agg, i) {
      agg.id = 'agg_' + (i + 1);
    });

    $scope.table = tabifyAggResponse(vis.getAggConfig().getResponseAggs(), fixtures.threeTermBuckets, {
      canSplit: false,
      isHierarchical: vis.isHierarchical()
    });
    const $el = $('<kbn-agg-table table="table"></kbn-agg-table>');
    $compile($el)($scope);
    $scope.$digest();

    expect($el.find('tbody').length).to.be(1);

    const $rows = $el.find('tbody tr');
    expect($rows.length).to.be.greaterThan(0);

    function validBytes(str) {
      expect(str).to.match(/^\d+$/);
      const bytesAsNum = _.parseInt(str);
      expect(bytesAsNum === 0 || bytesAsNum > 1000).to.be.ok();
    }

    $rows.each(function () {
      // 6 cells in every row
      const $cells = $(this).find('td');
      expect($cells.length).to.be(6);

      const txts = $cells.map(function () {
        return $(this).text().trim();
      });

      // two character country code
      expect(txts[0]).to.match(/^(png|jpg|gif|html|css)$/);
      validBytes(txts[1]);

      // country
      expect(txts[2]).to.match(/^\w\w$/);
      validBytes(txts[3]);

      // os
      expect(txts[4]).to.match(/^(win|mac|linux)$/);
      validBytes(txts[5]);
    });
  });

  describe('renders totals row', function () {
    function totalsRowTest(totalFunc, expected) {
      const vis = new Vis(indexPattern, {
        type: 'table',
        aggs: [
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          { type: 'min', schema: 'metric', params: { field: '@timestamp' } },
          { type: 'terms', schema: 'bucket', params: { field: 'extension' } },
          { type: 'date_histogram', schema: 'bucket', params: { field: '@timestamp', interval: 'd' } },
          { type: 'derivative', schema: 'metric', params: { metricAgg: 'custom', customMetric: { id: '5-orderAgg', type: 'count' } } },
          { type: 'top_hits', schema: 'metric', params: { field: 'bytes', aggregate: { val: 'min' }, size: 1 } }
        ]
      });
      vis.aggs.forEach(function (agg, i) {
        agg.id = 'agg_' + (i + 1);
      });
      function setDefaultTimezone() {
        moment.tz.setDefault(settings.get('dateFormat:tz'));
      }

      const off = $scope.$on('change:config.dateFormat:tz', setDefaultTimezone);
      const oldTimezoneSetting = settings.get('dateFormat:tz');
      settings.set('dateFormat:tz', 'UTC');

      $scope.table = tabifyAggResponse(vis.getAggConfig().getResponseAggs(),
        fixtures.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative,
        { canSplit: false, minimalColumns: true, asAggConfigResults: true }
      );
      $scope.showTotal = true;
      $scope.totalFunc = totalFunc;
      const $el = $('<kbn-agg-table table="table" show-total="showTotal" total-func="totalFunc"></kbn-agg-table>');
      $compile($el)($scope);
      $scope.$digest();

      expect($el.find('tfoot').length).to.be(1);

      const $rows = $el.find('tfoot tr');
      expect($rows.length).to.be(1);

      const $cells = $($rows[0]).find('th');
      expect($cells.length).to.be(6);

      for (let i = 0; i < 6; i++) {
        expect($($cells[i]).text()).to.be(expected[i]);
      }
      settings.set('dateFormat:tz', oldTimezoneSetting);
      off();
    }
    it('as count', function () {
      totalsRowTest('count', ['18', '18', '18', '18', '18', '18']);
    });
    it('as min', function () {
      totalsRowTest('min', [
        '',
        '2014-09-28',
        '9,283',
        'September 28th 2014, 00:00:00.000',
        '1',
        '11'
      ]);
    });
    it('as max', function () {
      totalsRowTest('max', [
        '',
        '2014-10-03',
        '220,943',
        'October 3rd 2014, 00:00:00.000',
        '239',
        '837'
      ]);
    });
    it('as avg', function () {
      totalsRowTest('avg', [
        '',
        '',
        '87,221.5',
        '',
        '64.667',
        '206.833'
      ]);
    });
    it('as sum', function () {
      totalsRowTest('sum', [
        '',
        '',
        '1,569,987',
        '',
        '1,164',
        '3,723'
      ]);
    });
  });

  describe('aggTable.toCsv()', function () {
    it('escapes and formats the rows and columns properly', function () {
      const $el = $compile('<kbn-agg-table table="table">')($scope);
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;

      $tableScope.table = {
        columns: [
          { title: 'one' },
          { title: 'two' },
          { title: 'with double-quotes(")' }
        ],
        rows: [
          [1, 2, '"foobar"']
        ]
      };

      expect(aggTable.toCsv()).to.be(
        'one,two,"with double-quotes("")"' + '\r\n' +
        '1,2,"""foobar"""' + '\r\n'
      );
    });
  });

  describe('aggTable.exportAsCsv()', function () {
    let origBlob;
    function FakeBlob(slices, opts) {
      this.slices = slices;
      this.opts = opts;
    }

    beforeEach(function () {
      origBlob = window.Blob;
      window.Blob = FakeBlob;
    });

    afterEach(function () {
      window.Blob = origBlob;
    });

    it('calls _saveAs properly', function () {
      const $el = $compile('<kbn-agg-table table="table">')($scope);
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;

      const saveAs = sinon.stub(aggTable, '_saveAs');
      $tableScope.table = {
        columns: [
          { title: 'one' },
          { title: 'two' },
          { title: 'with double-quotes(")' }
        ],
        rows: [
          [1, 2, '"foobar"']
        ]
      };

      aggTable.csv.filename = 'somefilename.csv';
      aggTable.exportAsCsv();

      expect(saveAs.callCount).to.be(1);
      const call = saveAs.getCall(0);
      expect(call.args[0]).to.be.a(FakeBlob);
      expect(call.args[0].slices).to.eql([
        'one,two,"with double-quotes("")"' + '\r\n' +
        '1,2,"""foobar"""' + '\r\n'
      ]);
      expect(call.args[0].opts).to.eql({
        type: 'text/plain;charset=utf-8'
      });
      expect(call.args[1]).to.be('somefilename.csv');
    });

    it('should use the export-title attribute', function () {
      const expected = 'export file name';
      const $el = $compile(`<kbn-agg-table table="table" export-title="exportTitle">`)($scope);
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;
      $tableScope.table = {
        columns: [],
        rows: []
      };
      $tableScope.exportTitle = expected;
      $scope.$digest();

      expect(aggTable.csv.filename).to.equal(`${expected}.csv`);
    });
  });
});
