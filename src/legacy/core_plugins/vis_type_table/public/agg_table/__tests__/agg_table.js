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

import $ from 'jquery';
import moment from 'moment';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import fixtures from 'fixtures/fake_hierarchical_data';
import sinon from 'sinon';
import { tabifyAggResponse, npStart } from '../../legacy_imports';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { round } from 'lodash';
import { tableVisTypeDefinition } from '../../table_vis_type';
import {
  setup as visualizationsSetup,
  start as visualizationsStart,
} from '../../../../visualizations/public/np_ready/public/legacy';
import { getAngularModule } from '../../get_inner_angular';
import { initTableVisLegacyModule } from '../../table_vis_legacy_module';
import { tableVisResponseHandler } from '../../table_vis_response_handler';

describe('Table Vis - AggTable Directive', function() {
  let $rootScope;
  let $compile;
  let indexPattern;
  let settings;
  const tabifiedData = {};

  const init = () => {
    const vis1 = new visualizationsStart.Vis(indexPattern, 'table');
    tabifiedData.metricOnly = tabifyAggResponse(vis1.aggs, fixtures.metricOnly);

    const vis2 = new visualizationsStart.Vis(indexPattern, {
      type: 'table',
      params: {
        showMetricsAtAllLevels: true,
      },
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'terms', schema: 'bucket', params: { field: 'extension' } },
        { type: 'terms', schema: 'bucket', params: { field: 'geo.src' } },
        { type: 'terms', schema: 'bucket', params: { field: 'machine.os' } },
      ],
    });
    vis2.aggs.aggs.forEach(function(agg, i) {
      agg.id = 'agg_' + (i + 1);
    });
    tabifiedData.threeTermBuckets = tabifyAggResponse(vis2.aggs, fixtures.threeTermBuckets, {
      metricsAtAllLevels: true,
    });

    const vis3 = new visualizationsStart.Vis(indexPattern, {
      type: 'table',
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'min', schema: 'metric', params: { field: '@timestamp' } },
        { type: 'terms', schema: 'bucket', params: { field: 'extension' } },
        {
          type: 'date_histogram',
          schema: 'bucket',
          params: { field: '@timestamp', interval: 'd' },
        },
        {
          type: 'derivative',
          schema: 'metric',
          params: { metricAgg: 'custom', customMetric: { id: '5-orderAgg', type: 'count' } },
        },
        {
          type: 'top_hits',
          schema: 'metric',
          params: { field: 'bytes', aggregate: { val: 'min' }, size: 1 },
        },
      ],
    });
    vis3.aggs.aggs.forEach(function(agg, i) {
      agg.id = 'agg_' + (i + 1);
    });

    tabifiedData.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative = tabifyAggResponse(
      vis3.aggs,
      fixtures.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative
    );
  };

  const initLocalAngular = () => {
    const tableVisModule = getAngularModule('kibana/table_vis', npStart.core);
    initTableVisLegacyModule(tableVisModule);
  };

  beforeEach(initLocalAngular);

  ngMock.inject(function() {
    visualizationsSetup.types.createBaseVisualization(tableVisTypeDefinition);
  });

  beforeEach(ngMock.module('kibana/table_vis'));
  beforeEach(
    ngMock.inject(function($injector, Private, config) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      settings = config;

      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');

      init();
    })
  );

  let $scope;
  beforeEach(function() {
    $scope = $rootScope.$new();
  });
  afterEach(function() {
    $scope.$destroy();
  });

  it('renders a simple response properly', function() {
    $scope.dimensions = {
      metrics: [{ accessor: 0, format: { id: 'number' }, params: {} }],
      buckets: [],
    };
    $scope.table = tableVisResponseHandler(tabifiedData.metricOnly, $scope.dimensions).tables[0];

    const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
      $scope
    );
    $scope.$digest();

    expect($el.find('tbody').length).to.be(1);
    expect($el.find('td').length).to.be(1);
    expect($el.find('td').text()).to.eql('1,000');
  });

  it('renders nothing if the table is empty', function() {
    $scope.dimensions = {};
    $scope.table = null;
    const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
      $scope
    );
    $scope.$digest();

    expect($el.find('tbody').length).to.be(0);
  });

  it('renders a complex response properly', async function() {
    $scope.dimensions = {
      buckets: [
        { accessor: 0, params: {} },
        { accessor: 2, params: {} },
        { accessor: 4, params: {} },
      ],
      metrics: [
        { accessor: 1, params: {} },
        { accessor: 3, params: {} },
        { accessor: 5, params: {} },
      ],
    };
    $scope.table = tableVisResponseHandler(
      tabifiedData.threeTermBuckets,
      $scope.dimensions
    ).tables[0];
    const $el = $('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>');
    $compile($el)($scope);
    $scope.$digest();

    expect($el.find('tbody').length).to.be(1);

    const $rows = $el.find('tbody tr');
    expect($rows.length).to.be.greaterThan(0);

    function validBytes(str) {
      const num = str.replace(/,/g, '');
      if (num !== '-') {
        expect(num).to.match(/^\d+$/);
      }
    }

    $rows.each(function() {
      // 6 cells in every row
      const $cells = $(this).find('td');
      expect($cells.length).to.be(6);

      const txts = $cells.map(function() {
        return $(this)
          .text()
          .trim();
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

  describe('renders totals row', function() {
    async function totalsRowTest(totalFunc, expected) {
      function setDefaultTimezone() {
        moment.tz.setDefault(settings.get('dateFormat:tz'));
      }

      const off = $scope.$on('change:config.dateFormat:tz', setDefaultTimezone);
      const oldTimezoneSetting = settings.get('dateFormat:tz');
      settings.set('dateFormat:tz', 'UTC');

      $scope.dimensions = {
        buckets: [
          { accessor: 0, params: {} },
          { accessor: 1, format: { id: 'date', params: { pattern: 'YYYY-MM-DD' } } },
        ],
        metrics: [
          { accessor: 2, format: { id: 'number' } },
          { accessor: 3, format: { id: 'date' } },
          { accessor: 4, format: { id: 'number' } },
          { accessor: 5, format: { id: 'number' } },
        ],
      };
      const response = tableVisResponseHandler(
        tabifiedData.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative,
        $scope.dimensions
      );
      $scope.table = response.tables[0];
      $scope.showTotal = true;
      $scope.totalFunc = totalFunc;
      const $el = $(`<kbn-agg-table
                      table="table"
                      show-total="showTotal"
                      total-func="totalFunc"
                      dimensions="dimensions"></kbn-agg-table>`);
      $compile($el)($scope);
      $scope.$digest();

      expect($el.find('tfoot').length).to.be(1);

      const $rows = $el.find('tfoot tr');
      expect($rows.length).to.be(1);

      const $cells = $($rows[0]).find('th');
      expect($cells.length).to.be(6);

      for (let i = 0; i < 6; i++) {
        expect(
          $($cells[i])
            .text()
            .trim()
        ).to.be(expected[i]);
      }
      settings.set('dateFormat:tz', oldTimezoneSetting);
      off();
    }
    it('as count', async function() {
      await totalsRowTest('count', ['18', '18', '18', '18', '18', '18']);
    });
    it('as min', async function() {
      await totalsRowTest('min', [
        '',
        '2014-09-28',
        '9,283',
        'Sep 28, 2014 @ 00:00:00.000',
        '1',
        '11',
      ]);
    });
    it('as max', async function() {
      await totalsRowTest('max', [
        '',
        '2014-10-03',
        '220,943',
        'Oct 3, 2014 @ 00:00:00.000',
        '239',
        '837',
      ]);
    });
    it('as avg', async function() {
      await totalsRowTest('avg', ['', '', '87,221.5', '', '64.667', '206.833']);
    });
    it('as sum', async function() {
      await totalsRowTest('sum', ['', '', '1,569,987', '', '1,164', '3,723']);
    });
  });

  describe('aggTable.toCsv()', function() {
    it('escapes rows and columns properly', function() {
      const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
        $scope
      );
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;
      $tableScope.table = {
        columns: [
          { id: 'a', name: 'one' },
          { id: 'b', name: 'two' },
          { id: 'c', name: 'with double-quotes(")' },
        ],
        rows: [{ a: 1, b: 2, c: '"foobar"' }],
      };

      expect(aggTable.toCsv()).to.be(
        'one,two,"with double-quotes("")"' + '\r\n' + '1,2,"""foobar"""' + '\r\n'
      );
    });

    it('exports rows and columns properly', async function() {
      $scope.dimensions = {
        buckets: [
          { accessor: 0, params: {} },
          { accessor: 2, params: {} },
          { accessor: 4, params: {} },
        ],
        metrics: [
          { accessor: 1, params: {} },
          { accessor: 3, params: {} },
          { accessor: 5, params: {} },
        ],
      };
      $scope.table = tableVisResponseHandler(
        tabifiedData.threeTermBuckets,
        $scope.dimensions
      ).tables[0];

      const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
        $scope
      );
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;
      $tableScope.table = $scope.table;

      const raw = aggTable.toCsv(false);
      expect(raw).to.be(
        '"extension: Descending","Average bytes","geo.src: Descending","Average bytes","machine.os: Descending","Average bytes"' +
          '\r\n' +
          'png,IT,win,412032,9299,0' +
          '\r\n' +
          'png,IT,mac,412032,9299,9299' +
          '\r\n' +
          'png,US,linux,412032,8293,3992' +
          '\r\n' +
          'png,US,mac,412032,8293,3029' +
          '\r\n' +
          'css,MX,win,412032,9299,4992' +
          '\r\n' +
          'css,MX,mac,412032,9299,5892' +
          '\r\n' +
          'css,US,linux,412032,8293,3992' +
          '\r\n' +
          'css,US,mac,412032,8293,3029' +
          '\r\n' +
          'html,CN,win,412032,9299,4992' +
          '\r\n' +
          'html,CN,mac,412032,9299,5892' +
          '\r\n' +
          'html,FR,win,412032,8293,3992' +
          '\r\n' +
          'html,FR,mac,412032,8293,3029' +
          '\r\n'
      );
    });

    it('exports formatted rows and columns properly', async function() {
      $scope.dimensions = {
        buckets: [
          { accessor: 0, params: {} },
          { accessor: 2, params: {} },
          { accessor: 4, params: {} },
        ],
        metrics: [
          { accessor: 1, params: {} },
          { accessor: 3, params: {} },
          { accessor: 5, params: {} },
        ],
      };
      $scope.table = tableVisResponseHandler(
        tabifiedData.threeTermBuckets,
        $scope.dimensions
      ).tables[0];

      const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
        $scope
      );
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;
      $tableScope.table = $scope.table;

      // Create our own converter since the ones we use for tests don't actually transform the provided value
      $tableScope.formattedColumns[0].formatter.convert = v => `${v}_formatted`;

      const formatted = aggTable.toCsv(true);
      expect(formatted).to.be(
        '"extension: Descending","Average bytes","geo.src: Descending","Average bytes","machine.os: Descending","Average bytes"' +
          '\r\n' +
          '"png_formatted",IT,win,412032,9299,0' +
          '\r\n' +
          '"png_formatted",IT,mac,412032,9299,9299' +
          '\r\n' +
          '"png_formatted",US,linux,412032,8293,3992' +
          '\r\n' +
          '"png_formatted",US,mac,412032,8293,3029' +
          '\r\n' +
          '"css_formatted",MX,win,412032,9299,4992' +
          '\r\n' +
          '"css_formatted",MX,mac,412032,9299,5892' +
          '\r\n' +
          '"css_formatted",US,linux,412032,8293,3992' +
          '\r\n' +
          '"css_formatted",US,mac,412032,8293,3029' +
          '\r\n' +
          '"html_formatted",CN,win,412032,9299,4992' +
          '\r\n' +
          '"html_formatted",CN,mac,412032,9299,5892' +
          '\r\n' +
          '"html_formatted",FR,win,412032,8293,3992' +
          '\r\n' +
          '"html_formatted",FR,mac,412032,8293,3029' +
          '\r\n'
      );
    });
  });

  it('renders percentage columns', async function() {
    $scope.dimensions = {
      buckets: [
        { accessor: 0, params: {} },
        { accessor: 1, format: { id: 'date', params: { pattern: 'YYYY-MM-DD' } } },
      ],
      metrics: [
        { accessor: 2, format: { id: 'number' } },
        { accessor: 3, format: { id: 'date' } },
        { accessor: 4, format: { id: 'number' } },
        { accessor: 5, format: { id: 'number' } },
      ],
    };
    const response = tableVisResponseHandler(
      tabifiedData.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative,
      $scope.dimensions
    );
    $scope.table = response.tables[0];
    $scope.percentageCol = 'Average bytes';

    const $el = $(`<kbn-agg-table
      table="table"
      dimensions="dimensions"
      percentage-col="percentageCol"
    ></kbn-agg-table>`);

    $compile($el)($scope);
    $scope.$digest();

    const $headings = $el.find('th');
    expect($headings.length).to.be(7);
    expect(
      $headings
        .eq(3)
        .text()
        .trim()
    ).to.be('Average bytes percentages');

    const countColId = $scope.table.columns.find(col => col.name === $scope.percentageCol).id;
    const counts = $scope.table.rows.map(row => row[countColId]);
    const total = counts.reduce((sum, curr) => sum + curr, 0);
    const $percentageColValues = $el.find('tbody tr').map((i, el) =>
      $(el)
        .find('td')
        .eq(3)
        .text()
    );

    $percentageColValues.each((i, value) => {
      const percentage = `${round((counts[i] / total) * 100, 1)}%`;
      expect(value).to.be(percentage);
    });
  });

  describe('aggTable.exportAsCsv()', function() {
    let origBlob;
    function FakeBlob(slices, opts) {
      this.slices = slices;
      this.opts = opts;
    }

    beforeEach(function() {
      origBlob = window.Blob;
      window.Blob = FakeBlob;
    });

    afterEach(function() {
      window.Blob = origBlob;
    });

    it('calls _saveAs properly', function() {
      const $el = $compile('<kbn-agg-table table="table"  dimensions="dimensions">')($scope);
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;

      const saveAs = sinon.stub(aggTable, '_saveAs');
      $tableScope.table = {
        columns: [
          { id: 'a', name: 'one' },
          { id: 'b', name: 'two' },
          { id: 'c', name: 'with double-quotes(")' },
        ],
        rows: [{ a: 1, b: 2, c: '"foobar"' }],
      };

      aggTable.csv.filename = 'somefilename.csv';
      aggTable.exportAsCsv();

      expect(saveAs.callCount).to.be(1);
      const call = saveAs.getCall(0);
      expect(call.args[0]).to.be.a(FakeBlob);
      expect(call.args[0].slices).to.eql([
        'one,two,"with double-quotes("")"' + '\r\n' + '1,2,"""foobar"""' + '\r\n',
      ]);
      expect(call.args[0].opts).to.eql({
        type: 'text/plain;charset=utf-8',
      });
      expect(call.args[1]).to.be('somefilename.csv');
    });

    it('should use the export-title attribute', function() {
      const expected = 'export file name';
      const $el = $compile(
        `<kbn-agg-table table="table"  dimensions="dimensions" export-title="exportTitle">`
      )($scope);
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;
      $tableScope.table = {
        columns: [],
        rows: [],
      };
      $tableScope.exportTitle = expected;
      $scope.$digest();

      expect(aggTable.csv.filename).to.equal(`${expected}.csv`);
    });
  });
});
