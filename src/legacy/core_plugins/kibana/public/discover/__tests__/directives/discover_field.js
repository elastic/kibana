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
import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { pluginInstance } from 'plugins/kibana/discover/index';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

// Load the kibana app dependencies.

describe('discoverField', function () {
  let $scope;
  let indexPattern;
  let $elem;
  beforeEach(() => pluginInstance.initializeServices(true));
  beforeEach(() => pluginInstance.initializeInnerAngular());
  beforeEach(ngMock.module('app/discover'));
  beforeEach(ngMock.inject(function (Private, $rootScope, $compile) {
    $elem = angular.element(`
      <discover-field
        field="field"
        on-add-field="addField"
        on-remove-field="removeField"
        on-show-details="showDetails"
      ></discover-field>
    `);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

    _.assign($rootScope, {
      field: indexPattern.fields.getByName('extension'),
      addField: sinon.spy(() => $rootScope.field.display = true),
      removeField: sinon.spy(() => $rootScope.field.display = false),
      showDetails: sinon.spy(() => $rootScope.field.details = { exists: true }),
    });

    $compile($elem)($rootScope);

    $scope = $elem.isolateScope();
    $scope.$digest();
    sinon.spy($scope, 'toggleDetails');
  }));

  afterEach(function () {
    $scope.toggleDetails.restore();
    $scope.$destroy();
  });

  describe('toggleDisplay', function () {
    it('should exist', function () {
      expect($scope.toggleDisplay).to.be.a(Function);
    });

    it('should call onAddField or onRemoveField depending on the display state', function () {
      $scope.toggleDisplay($scope.field);
      expect($scope.onAddField.callCount).to.be(1);
      expect($scope.onAddField.firstCall.args).to.eql([$scope.field.name]);

      $scope.toggleDisplay($scope.field);
      expect($scope.onRemoveField.callCount).to.be(1);
      expect($scope.onRemoveField.firstCall.args).to.eql([$scope.field.name]);
    });

    it('should call toggleDetails when currently showing the details', function () {
      $scope.toggleDetails($scope.field);
      $scope.toggleDisplay($scope.field);
      expect($scope.toggleDetails.callCount).to.be(2);
    });
  });

  describe('toggleDetails', function () {
    it('should notify the parent when showing the details', function () {
      $scope.toggleDetails($scope.field);
      expect($scope.onShowDetails.callCount).to.be(1);
    });
  });
});
