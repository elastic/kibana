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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { legacyResponseHandlerProvider } from 'ui/vis/response_handlers/legacy';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AppStateProvider } from 'ui/state_management/app_state';
import { tabifyAggResponse } from 'ui/agg_response/tabify';

describe('Table Vis Controller', function () {
  let $rootScope;
  let $compile;
  let Private;
  let $scope;
  let $el;
  let Vis;
  let fixtures;
  let AppState;
  let tableAggResponse;
  let tabifiedResponse;

  beforeEach(ngMock.module('kibana', 'kibana/table_vis'));
  beforeEach(ngMock.inject(function ($injector) {
    Private = $injector.get('Private');
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    fixtures = require('fixtures/fake_hierarchical_data');
    AppState = Private(AppStateProvider);
    Vis = Private(VisProvider);
    tableAggResponse =  legacyResponseHandlerProvider().handler;
  }));

  function OneRangeVis(params) {
    return new Vis(
      Private(FixturesStubbedLogstashIndexPatternProvider),
      {
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
                { from: 1000, to: 2000 }
              ]
            }
          }
        ]
      }
    );
  }

  const dimensions = {
    buckets: [{
      accessor: 0,
    }], metrics: [{
      accessor: 1,
      format: { id: 'range' },
    }]
  };

  // basically a parameterized beforeEach
  function initController(vis) {
    vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

    tabifiedResponse = tabifyAggResponse(vis.aggs, fixtures.oneRangeBucket);
    $rootScope.vis = vis;
    $rootScope.visParams = vis.params;
    $rootScope.uiState = new AppState({ uiState: {} }).makeStateful('uiState');
    $rootScope.renderComplete = () => {};
    $rootScope.newScope = function (scope) { $scope = scope; };

    $el = $('<div>')
      .attr('ng-controller', 'KbnTableVisController')
      .attr('ng-init', 'newScope(this)');

    $compile($el)($rootScope);
  }

  // put a response into the controller
  function attachEsResponseToScope(resp) {
    $rootScope.esResponse = resp;
    $rootScope.$apply();
  }

  // remove the response from the controller
  function removeEsResponseFromScope() {
    delete $rootScope.esResponse;
    $rootScope.renderComplete = () => {};
    $rootScope.$apply();
  }

  it('exposes #tableGroups and #hasSomeRows when a response is attached to scope', async function () {
    const vis = new OneRangeVis();
    initController(vis);

    expect(!$scope.tableGroups).to.be.ok();
    expect(!$scope.hasSomeRows).to.be.ok();

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));

    expect($scope.hasSomeRows).to.be(true);
    expect($scope.tableGroups).to.have.property('tables');
    expect($scope.tableGroups.tables).to.have.length(1);
    expect($scope.tableGroups.tables[0].columns).to.have.length(2);
    expect($scope.tableGroups.tables[0].rows).to.have.length(2);
  });

  it('clears #tableGroups and #hasSomeRows when the response is removed', async function () {
    const vis = new OneRangeVis();
    initController(vis);

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));
    removeEsResponseFromScope();

    expect(!$scope.hasSomeRows).to.be.ok();
    expect(!$scope.tableGroups).to.be.ok();
  });

  it('sets the sort on the scope when it is passed as a vis param', async function () {
    const sortObj = {
      columnIndex: 1,
      direction: 'asc'
    };
    const vis = new OneRangeVis({ sort: sortObj });
    initController(vis);

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));

    expect($scope.sort.columnIndex).to.equal(sortObj.columnIndex);
    expect($scope.sort.direction).to.equal(sortObj.direction);
  });

  it('sets #hasSomeRows properly if the table group is empty', async function () {
    const vis = new OneRangeVis();
    initController(vis);

    tabifiedResponse.rows = [];

    attachEsResponseToScope(await tableAggResponse(tabifiedResponse, dimensions));

    expect($scope.hasSomeRows).to.be(false);
    expect(!$scope.tableGroups).to.be.ok();
  });

  it('passes partialRows:true to tabify based on the vis params', function () {

    const vis = new OneRangeVis({ showPartialRows: true });
    initController(vis);

    expect(vis.isHierarchical()).to.equal(true);
  });

  it('passes partialRows:false to tabify based on the vis params', function () {

    const vis = new OneRangeVis({ showPartialRows: false });
    initController(vis);

    expect(vis.isHierarchical()).to.equal(false);
  });
});
