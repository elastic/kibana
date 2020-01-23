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

import angular, { IRootScopeService, IScope, ICompileService } from 'angular';
import 'angular-mocks';
import 'angular-sanitize';
import $ from 'jquery';
import './table_vis.mock';

// @ts-ignore
import StubIndexPattern from 'test_utils/stub_index_pattern';
import { getAngularModule } from './get_inner_angular';
import { initTableVisLegacyModule } from './table_vis_legacy_module';
import {
  npStart,
  legacyResponseHandlerProvider,
  AggConfig,
  tabifyAggResponse,
} from './legacy_imports';
import { tableVisTypeDefinition } from './table_vis_type';
import { Vis } from '../../visualizations/public';
import { setup as visualizationsSetup } from '../../visualizations/public/np_ready/public/legacy';
// eslint-disable-next-line
import { stubFields } from '../../../../plugins/data/public/stubs';
// eslint-disable-next-line
import { setFieldFormats } from '../../../../plugins/data/public/services';

interface TableVisScope extends IScope {
  [key: string]: any;
}

const oneRangeBucket = {
  hits: {
    total: 6039,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    agg_2: {
      buckets: {
        '0.0-1000.0': {
          from: 0,
          from_as_string: '0.0',
          to: 1000,
          to_as_string: '1000.0',
          doc_count: 606,
        },
        '1000.0-2000.0': {
          from: 1000,
          from_as_string: '1000.0',
          to: 2000,
          to_as_string: '2000.0',
          doc_count: 298,
        },
      },
    },
  },
};

describe('Table Vis - Controller', () => {
  let $rootScope: IRootScopeService & { [key: string]: any };
  let $compile: ICompileService;
  let $scope: TableVisScope;
  let $el: JQuery<HTMLElement>;
  let tableAggResponse: any;
  let tabifiedResponse: any;
  let stubIndexPattern: any;

  const initLocalAngular = () => {
    const tableVisModule = getAngularModule('kibana/table_vis', npStart.core);
    initTableVisLegacyModule(tableVisModule);
  };

  beforeEach(initLocalAngular);
  beforeAll(() => {
    visualizationsSetup.types.createBaseVisualization(tableVisTypeDefinition);
  });
  beforeEach(angular.mock.module('kibana/table_vis'));

  beforeEach(
    angular.mock.inject((_$rootScope_: IRootScopeService, _$compile_: ICompileService) => {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      tableAggResponse = legacyResponseHandlerProvider().handler;
    })
  );

  beforeEach(() => {
    setFieldFormats(({
      getDefaultInstance: jest.fn(),
    } as unknown) as any);
    stubIndexPattern = new StubIndexPattern(
      'logstash-*',
      (cfg: any) => cfg,
      'time',
      stubFields,
      npStart.core
    );
  });

  function getRangeVis(params?: object) {
    // @ts-ignore
    return new Vis(stubIndexPattern, {
      type: 'table',
      params: params || {},
      aggs: [
        { type: 'count', schema: 'metric' },
        {
          type: 'range',
          schema: 'bucket',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 },
            ],
          },
        },
      ],
    });
  }

  const dimensions = {
    buckets: [
      {
        accessor: 0,
      },
    ],
    metrics: [
      {
        accessor: 1,
        format: { id: 'range' },
      },
    ],
  };

  // basically a parameterized beforeEach
  function initController(vis: Vis) {
    vis.aggs.aggs.forEach((agg: AggConfig, i: number) => {
      agg.id = 'agg_' + (i + 1);
    });

    tabifiedResponse = tabifyAggResponse(vis.aggs, oneRangeBucket);
    $rootScope.vis = vis;
    $rootScope.visParams = vis.params;
    $rootScope.uiState = {
      get: jest.fn(),
      set: jest.fn(),
    };
    $rootScope.renderComplete = () => {};
    $rootScope.newScope = (scope: TableVisScope) => {
      $scope = scope;
    };

    $el = $('<div>')
      .attr('ng-controller', 'KbnTableVisController')
      .attr('ng-init', 'newScope(this)');

    $compile($el)($rootScope);
  }

  // put a response into the controller
  function attachEsResponseToScope(resp: object) {
    $rootScope.esResponse = resp;
    $rootScope.$apply();
  }

  // remove the response from the controller
  function removeEsResponseFromScope() {
    delete $rootScope.esResponse;
    $rootScope.renderComplete = () => {};
    $rootScope.$apply();
  }

  test('exposes #tableGroups and #hasSomeRows when a response is attached to scope', async () => {
    const vis: Vis = getRangeVis();
    initController(vis);

    expect(!$scope.tableGroups).toBeTruthy();
    expect(!$scope.hasSomeRows).toBeTruthy();

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));

    expect($scope.hasSomeRows).toBeTruthy();
    expect($scope.tableGroups.tables).toBeDefined();
    expect($scope.tableGroups.tables.length).toBe(1);
    expect($scope.tableGroups.tables[0].columns.length).toBe(2);
    expect($scope.tableGroups.tables[0].rows.length).toBe(2);
  });

  test('clears #tableGroups and #hasSomeRows when the response is removed', async () => {
    const vis = getRangeVis();
    initController(vis);

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));
    removeEsResponseFromScope();

    expect(!$scope.hasSomeRows).toBeTruthy();
    expect(!$scope.tableGroups).toBeTruthy();
  });

  test('sets the sort on the scope when it is passed as a vis param', async () => {
    const sortObj = {
      columnIndex: 1,
      direction: 'asc',
    };
    const vis = getRangeVis({ sort: sortObj });
    initController(vis);

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));

    expect($scope.sort.columnIndex).toEqual(sortObj.columnIndex);
    expect($scope.sort.direction).toEqual(sortObj.direction);
  });

  test('sets #hasSomeRows properly if the table group is empty', async () => {
    const vis = getRangeVis();
    initController(vis);

    tabifiedResponse.rows = [];

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));

    expect($scope.hasSomeRows).toBeFalsy();
    expect(!$scope.tableGroups).toBeTruthy();
  });

  test('passes partialRows:true to tabify based on the vis params', () => {
    const vis = getRangeVis({ showPartialRows: true });
    initController(vis);

    expect(vis.isHierarchical()).toEqual(true);
  });

  test('passes partialRows:false to tabify based on the vis params', () => {
    const vis = getRangeVis({ showPartialRows: false });
    initController(vis);

    expect(vis.isHierarchical()).toEqual(false);
  });
});
