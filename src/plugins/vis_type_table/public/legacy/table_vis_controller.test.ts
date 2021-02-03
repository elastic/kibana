/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import angular, { IRootScopeService, IScope, ICompileService } from 'angular';
import 'angular-mocks';
import 'angular-sanitize';
import $ from 'jquery';

import { getAngularModule } from './get_inner_angular';
import { initTableVisLegacyModule } from './table_vis_legacy_module';
import { tableVisLegacyTypeDefinition } from './table_vis_legacy_type';
import { Vis } from '../../../visualizations/public';
import { stubFields } from '../../../data/public/stubs';
import { tableVisLegacyResponseHandler } from './table_vis_legacy_response_handler';
import { coreMock } from '../../../../core/public/mocks';
import { IAggConfig, search } from '../../../data/public';
import { getStubIndexPattern } from '../../../data/public/test_utils';
import { searchServiceMock } from '../../../data/public/search/mocks';

const { createAggConfigs } = searchServiceMock.createStartContract().aggs;

const { tabifyAggResponse } = search;

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
    const tableVisModule = getAngularModule(
      'kibana/table_vis',
      coreMock.createStart(),
      coreMock.createPluginInitializerContext()
    );
    initTableVisLegacyModule(tableVisModule);
  };

  beforeEach(initLocalAngular);
  beforeEach(angular.mock.module('kibana/table_vis'));

  beforeEach(
    angular.mock.inject((_$rootScope_: IRootScopeService, _$compile_: ICompileService) => {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      tableAggResponse = tableVisLegacyResponseHandler;
    })
  );

  beforeEach(() => {
    stubIndexPattern = getStubIndexPattern(
      'logstash-*',
      (cfg: any) => cfg,
      'time',
      stubFields,
      coreMock.createSetup()
    );
  });

  function getRangeVis(params?: object) {
    return ({
      type: tableVisLegacyTypeDefinition,
      params: Object.assign({}, tableVisLegacyTypeDefinition.visConfig?.defaults, params),
      data: {
        aggs: createAggConfigs(stubIndexPattern, [
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
        ]),
      },
    } as unknown) as Vis;
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
    vis.data.aggs!.aggs.forEach((agg: IAggConfig, i: number) => {
      agg.id = 'agg_' + (i + 1);
    });

    tabifiedResponse = tabifyAggResponse(vis.data.aggs!, oneRangeBucket);
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

    expect((vis.type.hierarchicalData as Function)(vis)).toEqual(true);
  });

  test('passes partialRows:false to tabify based on the vis params', () => {
    const vis = getRangeVis({ showPartialRows: false });
    initController(vis);

    expect((vis.type.hierarchicalData as Function)(vis)).toEqual(false);
  });
});
