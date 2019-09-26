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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../inequality';

describe('greater_than model validator directive', function () {
  let $compile;
  let $rootScope;
  let html;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  describe('without value', function () {
    let element;
    beforeEach(function () {
      html = '<input type="text" ng-model="value" greater-than />';
      element = $compile(html)($rootScope);
    });

    it('should be valid when larger than 0', function () {
      $rootScope.value = '1';
      $rootScope.$digest();
      expect(element.hasClass('ng-valid')).to.be.ok();
    });

    it('should be valid for 0', function () {
      $rootScope.value = '0';
      $rootScope.$digest();
      expect(element.hasClass('ng-valid')).to.be.ok();
    });

    it('should be valid for negatives', function () {
      $rootScope.value = '-10';
      $rootScope.$digest();
      expect(element.hasClass('ng-valid')).to.be.ok();
    });
  });

  describe('with string values', function () {
    let element;
    beforeEach(function () {
      html = `<input type="text" ng-model="value" greater-than="'10'" />`;
      element = $compile(html)($rootScope);
    });

    it('should be valid for greater than 10', function () {
      $rootScope.value = '15';
      $rootScope.$digest();
      expect(element.hasClass('ng-valid')).to.be.ok();
    });

    it('should be invalid for 10', function () {
      $rootScope.value = '10';
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });

    // Edge case because '5' > '10' as strings
    it('should be invalid less than 10', function () {
      $rootScope.value = '5';
      $rootScope.$digest();
      expect(element.hasClass('ng-invalid')).to.be.ok();
    });
  });

  [0, 1, 10, 42, -12].forEach(function (num) {
    describe('with value ' + num, function () {
      let element;
      beforeEach(function () {
        html = '<input type="text" ng-model="value" greater-than="' + num + '" />';
        element = $compile(html)($rootScope);
      });

      it('should be valid when larger than ' + num, function () {
        $rootScope.value = num + 1;
        $rootScope.$digest();
        expect(element.hasClass('ng-valid')).to.be.ok();
      });

      it('should be invalid for ' + num, function () {
        $rootScope.value = num;
        $rootScope.$digest();
        expect(element.hasClass('ng-invalid')).to.be.ok();
      });

      it('should be invalid for less than ' + num, function () {
        $rootScope.value = num - 1;
        $rootScope.$digest();
        expect(element.hasClass('ng-invalid')).to.be.ok();
      });

      it('should be valid for empty model values', () => {
        [undefined, null, ''].forEach(val => {
          $rootScope.value = val;
          $rootScope.$digest();
          expect(element.hasClass('ng-valid')).to.be.ok();
        });
      });
    });
  });
});
