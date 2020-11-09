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
import angular from 'angular';
import _ from 'lodash';
import 'angular-mocks';
import 'angular-sanitize';
import 'angular-route';
import { createBrowserHistory } from 'history';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import hits from 'fixtures/real_hits';
import { coreMock } from '../../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../../data/public/mocks';
import { navigationPluginMock } from '../../../../../navigation/public/mocks';
import { setScopedHistory, setServices } from '../../../kibana_services';
import { getInnerAngularModule } from '../../../get_inner_angular';

let $parentScope;

let $scope;

let $timeout;

let indexPattern;

const init = function ($elem, props) {
  angular.mock.inject(function ($rootScope, $compile, _$timeout_) {
    $timeout = _$timeout_;
    $parentScope = $rootScope;
    _.assign($parentScope, props);

    $compile($elem)($parentScope);

    // I think the prereq requires this?
    $timeout(() => {
      $elem.scope().$digest();
    }, 0);

    $scope = $elem.isolateScope();
  });
};

const destroy = () => {
  $scope.$destroy();
  $parentScope.$destroy();
};

describe('docTable', () => {
  const core = coreMock.createStart();
  let $elem;

  beforeAll(() => setScopedHistory(createBrowserHistory()));
  beforeEach(() => {
    angular.element.prototype.slice = jest.fn(() => {
      return null;
    });
    angular.element.prototype.filter = jest.fn(() => {
      return {
        remove: jest.fn(),
      };
    });
    setServices({
      uiSettings: core.uiSettings,
    });
    getInnerAngularModule(
      'app/discover',
      core,
      {
        data: dataPluginMock.createStartContract(),
        navigation: navigationPluginMock.createStartContract(),
      },
      coreMock.createPluginInitializerContext()
    );
    angular.mock.module('app/discover');
  });
  beforeEach(() => {
    $elem = angular.element(`
      <doc-table
        index-pattern="indexPattern"
        hits="hits"
        total-hit-count="totalHitCount"
        columns="columns"
        sorting="sorting"
      ></doc-table>
    `);
    angular.mock.inject(function (Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    });
    init($elem, {
      indexPattern,
      hits: [...hits],
      totalHitCount: hits.length,
      columns: [],
      sorting: ['@timestamp', 'desc'],
    });
    $scope.$digest();
  });

  afterEach(() => {
    delete angular.element.prototype.slice;
    delete angular.element.prototype.filter;
    destroy();
  });

  test('should compile', () => {
    expect($elem.text()).toBeTruthy();
  });

  test('should have an addRows function that increases the row count', () => {
    expect($scope.addRows).toBeInstanceOf(Function);
    $scope.$digest();
    expect($scope.limit).toBe(50);
    $scope.addRows();
    expect($scope.limit).toBe(100);
  });

  test('should reset the row limit when results are received', () => {
    $scope.limit = 100;
    expect($scope.limit).toBe(100);
    $scope.hits = [...hits];
    $scope.$digest();
    expect($scope.limit).toBe(50);
  });

  test('should have a header and a table element', () => {
    $scope.$digest();

    expect($elem.find('thead').length).toBe(1);
    expect($elem.find('table').length).toBe(1);
  });
});
