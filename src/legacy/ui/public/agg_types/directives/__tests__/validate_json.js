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
import ngMock from 'ng_mock';
import '../validate_json';

// Load the kibana app dependencies.

let $parentScope;
let $elemScope;
let $elem;
const mockScope = '';

const input = {
  valid: '{ "test": "json input" }',
  invalid: 'strings are not json'
};

const markup = {
  textarea: '<textarea ng-model="mockModel" validate-json></textarea>',
  input: '<input type="text" ng-model="mockModel" validate-json>'
};

const init = function (type) {
  // Load the application
  ngMock.module('kibana');
  type = type || 'input';
  const elMarkup = markup[type];

  // Create the scope
  ngMock.inject(function ($injector, $rootScope, $compile) {
    // Give us a scope
    $parentScope = $rootScope;
    $parentScope.mockModel = mockScope;

    $elem = angular.element(elMarkup);
    $compile($elem)($parentScope);
    $elemScope = $elem.isolateScope();
  });
};

describe('validate-json directive', function () {
  const checkValid = function (inputVal, className) {
    $parentScope.mockModel = inputVal;
    $elem.scope().$digest();
    expect($elem.hasClass(className)).to.be(true);
  };

  describe('initialization', function () {
    beforeEach(function () {
      init();
    });

    it('should use the model', function () {
      expect($elemScope).to.have.property('ngModel');
    });

  });

  Object.keys(markup).forEach(function (inputType) {
    describe(inputType, function () {
      beforeEach(function () {
        init(inputType);
      });

      it('should be an input', function () {
        expect($elem.get(0).tagName).to.be(inputType.toUpperCase());
      });

      it('should set valid state', function () {
        checkValid(input.valid, 'ng-valid');
      });

      it('should be valid when empty', function () {
        checkValid('', 'ng-valid');
      });

      it('should set invalid state', function () {
        checkValid(input.invalid, 'ng-invalid');
      });

      it('should be invalid if a number', function () {
        checkValid('0', 'ng-invalid');
      });

      it('should update validity on changes', function () {
        checkValid(input.valid, 'ng-valid');
        checkValid(input.invalid, 'ng-invalid');
        checkValid(input.valid, 'ng-valid');
      });
    });
  });
});
