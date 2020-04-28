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

import angular, { ICompileService, IRootScopeService, ITimeoutService } from 'angular';
import _ from 'lodash';
// @ts-ignore
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
// @ts-ignore
import hits from 'fixtures/real_hits';
import 'angular-mocks';
import 'angular-sanitize';
import 'angular-route';

import { coreMock } from '../../../../../../core/public/mocks';
import { initializeInnerAngularModule } from '../../../get_inner_angular';
import { navigationPluginMock } from '../../../../../navigation/public/mocks';
import { dataPluginMock } from '../../../../../data/public/mocks';
import { initAngularBootstrap } from '../../../../../kibana_legacy/public';
import { LazyScope } from './doc_table';

jest.mock('../../../kibana_services', () => ({
  getServices: () => ({
    uiSettings: {
      get: jest.fn(),
    },
  }),
}));

let $parentScope: IRootScopeService;
let $scope: LazyScope;
let indexPattern: any;

const destroy = function() {
  $scope.$destroy();
  $parentScope.$destroy();
};

describe.skip('docTable', function() {
  let $elem: JQuery;

  beforeEach(() => {
    initAngularBootstrap();
    initializeInnerAngularModule(
      'app/discover',
      coreMock.createStart(),
      navigationPluginMock.createStartContract(),
      dataPluginMock.createStartContract()
    );

    $elem = angular.element(`
    <doc-table
      index-pattern="indexPattern"
      hits="hits"
      total-hit-count="totalHitCount"
      columns="columns"
      sorting="sorting"
    ></doc-table>
  `);

    angular.mock.module('app/discover');

    angular.mock.inject(function(Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    });

    angular.mock.inject(
      ($compile: ICompileService, $timeout: ITimeoutService, $rootScope: IRootScopeService) => {
        $parentScope = $rootScope;
        _.assign($parentScope, {
          indexPattern,
          hits: [...hits],
          totalHitCount: hits.length,
          columns: [],
          sorting: ['@timestamp', 'desc'],
        });

        $compile($elem)($parentScope);

        // I think the prereq requires this?
        $timeout(function() {
          $elem.scope().$digest();
        }, 0);

        $scope = $elem.isolateScope();
      }
    );
    $scope.$digest();
  });

  afterEach(function() {
    destroy();
  });

  it('should compile', function() {
    expect($elem.text()).toBeTruthy();
  });

  it('should have an addRows function that increases the row count', function() {
    expect($scope.addRows).toEqual(expect.any(Function));
    $scope.$digest();
    expect($scope.limit).toBe(50);
    $scope.addRows();
    expect($scope.limit).toBe(100);
  });

  it('should reset the row limit when results are received', function() {
    $scope.limit = 100;
    expect($scope.limit).toBe(100);
    $scope.hits = [...hits];
    $scope.$digest();
    expect($scope.limit).toBe(50);
  });

  it('should have a header and a table element', function() {
    $scope.$digest();

    expect($elem.find('thead').length).toBe(1);
    expect($elem.find('table').length).toBe(1);
  });
});
