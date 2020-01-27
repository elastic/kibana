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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import $ from 'jquery';

describe('fancy forms', function() {
  let $el;
  let $scope;
  let $compile;
  let $rootScope;
  let ngForm;

  function generateEl() {
    return $('<form>').html($('<input ng-model="val" required>'));
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector) {
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');

      $scope = $rootScope.$new();
      $el = generateEl();

      $compile($el)($scope);
      $scope.$apply();

      ngForm = $el.controller('form');
    })
  );

  describe('ngFormController', function() {
    it('counts errors', function() {
      expect(ngForm.errorCount()).to.be(1);
    });

    it('clears errors', function() {
      $scope.val = 'something';
      $scope.$apply();
      expect(ngForm.errorCount()).to.be(0);
    });
  });
});
