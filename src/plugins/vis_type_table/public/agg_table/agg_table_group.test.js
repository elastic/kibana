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
import angular from 'angular';
import 'angular-mocks';
import expect from '@kbn/expect';

import { getFieldFormatsRegistry } from '../../../../test_utils/public/stub_field_formats';
import { coreMock } from '../../../../core/public/mocks';
import { initAngularBootstrap } from '../../../kibana_legacy/public';
import { setUiSettings } from '../../../data/public/services';
import { setFormatService } from '../services';
import { getInnerAngular } from '../get_inner_angular';
import { initTableVisLegacyModule } from '../table_vis_legacy_module';
import { tabifiedData } from './tabified_data';

const uiSettings = new Map();

describe('Table Vis - AggTableGroup Directive', function () {
  const core = coreMock.createStart();
  let $rootScope;
  let $compile;

  core.uiSettings.set = jest.fn((key, value) => {
    uiSettings.set(key, value);
  });

  core.uiSettings.get = jest.fn((key) => {
    return uiSettings.get(key);
  });

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
    angular.mock.inject(($injector) => {
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

  it('renders a simple split response properly', function () {
    $scope.dimensions = {
      metrics: [{ accessor: 0, format: { id: 'number' }, params: {} }],
      buckets: [],
    };
    $scope.group = tabifiedData.metricOnly;
    $scope.sort = {
      columnIndex: null,
      direction: null,
    };
    const $el = $(
      '<kbn-agg-table-group dimensions="dimensions" group="group"></kbn-agg-table-group>'
    );

    $compile($el)($scope);
    $scope.$digest();

    // should create one sub-tbale
    expect($el.find('kbn-agg-table').length).to.be(1);
  });

  it('renders nothing if the table list is empty', function () {
    const $el = $(
      '<kbn-agg-table-group dimensions="dimensions" group="group"></kbn-agg-table-group>'
    );

    $scope.group = {
      tables: [],
    };

    $compile($el)($scope);
    $scope.$digest();

    const $subTables = $el.find('kbn-agg-table');
    expect($subTables.length).to.be(0);
  });

  it('renders a complex response properly', function () {
    $scope.dimensions = {
      splitRow: [{ accessor: 0, params: {} }],
      buckets: [
        { accessor: 2, params: {} },
        { accessor: 4, params: {} },
      ],
      metrics: [
        { accessor: 1, params: {} },
        { accessor: 3, params: {} },
        { accessor: 5, params: {} },
      ],
    };
    const group = ($scope.group = tabifiedData.threeTermBucketsWithSplit);
    const $el = $(
      '<kbn-agg-table-group dimensions="dimensions" group="group"></kbn-agg-table-group>'
    );
    $compile($el)($scope);
    $scope.$digest();

    const $subTables = $el.find('kbn-agg-table');
    expect($subTables.length).to.be(3);

    const $subTableHeaders = $el.find('.kbnAggTable__groupHeader');
    expect($subTableHeaders.length).to.be(3);

    $subTableHeaders.each(function (i) {
      expect($(this).text()).to.be(group.tables[i].title);
    });
  });
});
