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
import expect from '@kbn/expect';
import _ from 'lodash';
import ngMock from 'ng_mock';
import 'ui/private';
import { pluginInstance } from 'plugins/kibana/discover/index';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import hits from 'fixtures/real_hits';

// Load the kibana app dependencies.


let $parentScope;


let $scope;


let $timeout;


let indexPattern;

const init = function ($elem, props) {
  ngMock.inject(function ($rootScope, $compile, _$timeout_) {
    $timeout = _$timeout_;
    $parentScope = $rootScope;
    _.assign($parentScope, props);

    $compile($elem)($parentScope);

    // I think the prereq requires this?
    $timeout(function () {
      $elem.scope().$digest();
    }, 0);

    $scope = $elem.isolateScope();

  });
};

const destroy = function () {
  $scope.$destroy();
  $parentScope.$destroy();
};

describe('docTable', function () {
  let $elem;
  beforeEach(() => pluginInstance.initializeInnerAngular());
  beforeEach(ngMock.module('app/discover'));
  beforeEach(function () {
    $elem = angular.element(`
      <doc-table
        index-pattern="indexPattern"
        hits="hits"
        total-hit-count="totalHitCount"
        columns="columns"
        sorting="sorting"
      ></doc-table>
    `);
    ngMock.inject(function (Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    });
    init($elem, {
      indexPattern,
      hits: [...hits],
      totalHitCount: hits.length,
      columns: [],
      sorting: ['@timestamp', 'desc']
    });
    $scope.$digest();

  });

  afterEach(function () {
    destroy();
  });

  it('should compile', function () {
    expect($elem.text()).to.not.be.empty();
  });

  it('should have an addRows function that increases the row count', function () {
    expect($scope.addRows).to.be.a(Function);
    $scope.$digest();
    expect($scope.limit).to.be(50);
    $scope.addRows();
    expect($scope.limit).to.be(100);
  });

  it('should reset the row limit when results are received', function () {
    $scope.limit = 100;
    expect($scope.limit).to.be(100);
    $scope.hits = [...hits];
    $scope.$digest();
    expect($scope.limit).to.be(50);
  });

  it('should have a header and a table element', function () {
    $scope.$digest();

    expect($elem.find('thead').length).to.be(1);
    expect($elem.find('table').length).to.be(1);
  });

});
