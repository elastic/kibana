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
import angular from 'angular';
import 'angular-mocks';
import sinon from 'sinon';
import { round } from 'lodash';

import { getFieldFormatsRegistry } from '../../../../test_utils/public/stub_field_formats';
import { coreMock } from '../../../../core/public/mocks';
import { initAngularBootstrap } from '../../../kibana_legacy/public';
import { setUiSettings } from '../../../data/public/services';
import { UI_SETTINGS } from '../../../data/public/';
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../../../share/public';

import { setFormatService } from '../services';
import { getInnerAngular } from '../get_inner_angular';
import { initTableVisLegacyModule } from '../table_vis_legacy_module';
import { tabifiedData } from './tabified_data';

const uiSettings = new Map();

describe('Table Vis - AggTable Directive', function () {
  const core = coreMock.createStart();

  core.uiSettings.set = jest.fn((key, value) => {
    uiSettings.set(key, value);
  });

  core.uiSettings.get = jest.fn((key) => {
    const defaultValues = {
      dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
      'dateFormat:tz': 'UTC',
      [UI_SETTINGS.SHORT_DOTS_ENABLE]: true,
      [UI_SETTINGS.FORMAT_CURRENCY_DEFAULT_PATTERN]: '($0,0.[00])',
      [UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[000]',
      [UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: '0,0.[000]%',
      [UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE]: 'en',
      [UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP]: {},
      [CSV_SEPARATOR_SETTING]: ',',
      [CSV_QUOTE_VALUES_SETTING]: true,
    };

    return defaultValues[key] || uiSettings.get(key);
  });

  let $rootScope;
  let $compile;
  let settings;

  const initLocalAngular = () => {
    const tableVisModule = getInnerAngular('kibana/table_vis', core);
    initTableVisLegacyModule(tableVisModule);
  };

  beforeEach(() => {
    setUiSettings(core.uiSettings);
    setFormatService(getFieldFormatsRegistry(core));
    initAngularBootstrap();
    initLocalAngular();
    angular.mock.module('kibana/table_vis');
    angular.mock.inject(($injector, config) => {
      settings = config;

      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');
    });
  });

  let $scope;
  beforeEach(function () {
    $scope = $rootScope.$new();
  });
  afterEach(function () {
    $scope.$destroy();
  });

  test('renders a simple response properly', function () {
    $scope.dimensions = {
      metrics: [{ accessor: 0, format: { id: 'number' }, params: {} }],
      buckets: [],
    };
    $scope.table = tabifiedData.metricOnly.tables[0];

    const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
      $scope
    );
    $scope.$digest();

    expect($el.find('tbody').length).toBe(1);
    expect($el.find('td').length).toBe(1);
    expect($el.find('td').text()).toEqual('1,000');
  });

  test('renders nothing if the table is empty', function () {
    $scope.dimensions = {};
    $scope.table = null;
    const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
      $scope
    );
    $scope.$digest();

    expect($el.find('tbody').length).toBe(0);
  });

  test('renders a complex response properly', async function () {
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
    $scope.table = tabifiedData.threeTermBuckets.tables[0];
    const $el = $('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>');
    $compile($el)($scope);
    $scope.$digest();

    expect($el.find('tbody').length).toBe(1);

    const $rows = $el.find('tbody tr');
    expect($rows.length).toBeGreaterThan(0);

    function validBytes(str) {
      const num = str.replace(/,/g, '');
      if (num !== '-') {
        expect(num).toMatch(/^\d+$/);
      }
    }

    $rows.each(function () {
      // 6 cells in every row
      const $cells = $(this).find('td');
      expect($cells.length).toBe(6);

      const txts = $cells.map(function () {
        return $(this).text().trim();
      });

      // two character country code
      expect(txts[0]).toMatch(/^(png|jpg|gif|html|css)$/);
      validBytes(txts[1]);

      // country
      expect(txts[2]).toMatch(/^\w\w$/);
      validBytes(txts[3]);

      // os
      expect(txts[4]).toMatch(/^(win|mac|linux)$/);
      validBytes(txts[5]);
    });
  });

  describe('renders totals row', function () {
    async function totalsRowTest(totalFunc, expected) {
      function setDefaultTimezone() {
        moment.tz.setDefault(settings.get('dateFormat:tz'));
      }

      const oldTimezoneSetting = settings.get('dateFormat:tz');
      settings.set('dateFormat:tz', 'UTC');
      setDefaultTimezone();

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
      $scope.table =
        tabifiedData.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative.tables[0];
      $scope.showTotal = true;
      $scope.totalFunc = totalFunc;
      const $el = $(`<kbn-agg-table
                      table="table"
                      show-total="showTotal"
                      total-func="totalFunc"
                      dimensions="dimensions"></kbn-agg-table>`);
      $compile($el)($scope);
      $scope.$digest();

      expect($el.find('tfoot').length).toBe(1);

      const $rows = $el.find('tfoot tr');
      expect($rows.length).toBe(1);

      const $cells = $($rows[0]).find('th');
      expect($cells.length).toBe(6);

      for (let i = 0; i < 6; i++) {
        expect($($cells[i]).text().trim()).toBe(expected[i]);
      }
      settings.set('dateFormat:tz', oldTimezoneSetting);
      setDefaultTimezone();
    }
    test('as count', async function () {
      await totalsRowTest('count', ['18', '18', '18', '18', '18', '18']);
    });
    test('as min', async function () {
      await totalsRowTest('min', [
        '',
        '2014-09-28',
        '9,283',
        'Sep 28, 2014 @ 00:00:00.000',
        '1',
        '11',
      ]);
    });
    test('as max', async function () {
      await totalsRowTest('max', [
        '',
        '2014-10-03',
        '220,943',
        'Oct 3, 2014 @ 00:00:00.000',
        '239',
        '837',
      ]);
    });
    test('as avg', async function () {
      await totalsRowTest('avg', ['', '', '87,221.5', '', '64.667', '206.833']);
    });
    test('as sum', async function () {
      await totalsRowTest('sum', ['', '', '1,569,987', '', '1,164', '3,723']);
    });
  });

  describe('aggTable.toCsv()', function () {
    test('escapes rows and columns properly', function () {
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

      expect(aggTable.toCsv()).toBe(
        'one,two,"with double-quotes("")"' + '\r\n' + '1,2,"""foobar"""' + '\r\n'
      );
    });

    test('exports rows and columns properly', async function () {
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
      $scope.table = tabifiedData.threeTermBuckets.tables[0];

      const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
        $scope
      );
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;
      $tableScope.table = $scope.table;

      const raw = aggTable.toCsv(false);
      expect(raw).toBe(
        '"extension: Descending","Average bytes","geo.src: Descending","Average bytes","machine.os: Descending","Average bytes"' +
          '\r\n' +
          'png,412032,IT,9299,win,0' +
          '\r\n' +
          'png,412032,IT,9299,mac,9299' +
          '\r\n' +
          'png,412032,US,8293,linux,3992' +
          '\r\n' +
          'png,412032,US,8293,mac,3029' +
          '\r\n' +
          'css,412032,MX,9299,win,4992' +
          '\r\n' +
          'css,412032,MX,9299,mac,5892' +
          '\r\n' +
          'css,412032,US,8293,linux,3992' +
          '\r\n' +
          'css,412032,US,8293,mac,3029' +
          '\r\n' +
          'html,412032,CN,9299,win,4992' +
          '\r\n' +
          'html,412032,CN,9299,mac,5892' +
          '\r\n' +
          'html,412032,FR,8293,win,3992' +
          '\r\n' +
          'html,412032,FR,8293,mac,3029' +
          '\r\n'
      );
    });

    test('exports formatted rows and columns properly', async function () {
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
      $scope.table = tabifiedData.threeTermBuckets.tables[0];

      const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
        $scope
      );
      $scope.$digest();

      const $tableScope = $el.isolateScope();
      const aggTable = $tableScope.aggTable;
      $tableScope.table = $scope.table;

      // Create our own converter since the ones we use for tests don't actually transform the provided value
      $tableScope.formattedColumns[0].formatter.convert = (v) => `${v}_formatted`;

      const formatted = aggTable.toCsv(true);
      expect(formatted).toBe(
        '"extension: Descending","Average bytes","geo.src: Descending","Average bytes","machine.os: Descending","Average bytes"' +
          '\r\n' +
          '"png_formatted",412032,IT,9299,win,0' +
          '\r\n' +
          '"png_formatted",412032,IT,9299,mac,9299' +
          '\r\n' +
          '"png_formatted",412032,US,8293,linux,3992' +
          '\r\n' +
          '"png_formatted",412032,US,8293,mac,3029' +
          '\r\n' +
          '"css_formatted",412032,MX,9299,win,4992' +
          '\r\n' +
          '"css_formatted",412032,MX,9299,mac,5892' +
          '\r\n' +
          '"css_formatted",412032,US,8293,linux,3992' +
          '\r\n' +
          '"css_formatted",412032,US,8293,mac,3029' +
          '\r\n' +
          '"html_formatted",412032,CN,9299,win,4992' +
          '\r\n' +
          '"html_formatted",412032,CN,9299,mac,5892' +
          '\r\n' +
          '"html_formatted",412032,FR,8293,win,3992' +
          '\r\n' +
          '"html_formatted",412032,FR,8293,mac,3029' +
          '\r\n'
      );
    });
  });

  test('renders percentage columns', async function () {
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
    $scope.table =
      tabifiedData.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative.tables[0];
    $scope.percentageCol = 'Average bytes';

    const $el = $(`<kbn-agg-table
      table="table"
      dimensions="dimensions"
      percentage-col="percentageCol"
    ></kbn-agg-table>`);

    $compile($el)($scope);
    $scope.$digest();

    const $headings = $el.find('th');
    expect($headings.length).toBe(7);
    expect($headings.eq(3).text().trim()).toBe('Average bytes percentages');

    const countColId = $scope.table.columns.find((col) => col.name === $scope.percentageCol).id;
    const counts = $scope.table.rows.map((row) => row[countColId]);
    const total = counts.reduce((sum, curr) => sum + curr, 0);
    const $percentageColValues = $el.find('tbody tr').map((i, el) => $(el).find('td').eq(3).text());

    $percentageColValues.each((i, value) => {
      const percentage = `${round((counts[i] / total) * 100, 3)}%`;
      expect(value).toBe(percentage);
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

    test('calls _saveAs properly', function () {
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

      expect(saveAs.callCount).toBe(1);
      const call = saveAs.getCall(0);
      expect(call.args[0]).toBeInstanceOf(FakeBlob);
      expect(call.args[0].slices).toEqual([
        'one,two,"with double-quotes("")"' + '\r\n' + '1,2,"""foobar"""' + '\r\n',
      ]);
      expect(call.args[0].opts).toEqual({
        type: 'text/plain;charset=utf-8',
      });
      expect(call.args[1]).toBe('somefilename.csv');
    });

    test('should use the export-title attribute', function () {
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

      expect(aggTable.csv.filename).toEqual(`${expected}.csv`);
    });
  });
});
