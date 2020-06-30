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
import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../kbn_accessible_click';
import { keyCodes } from '@elastic/eui';

describe('kbnAccessibleClick directive', () => {
  let $compile;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));

  beforeEach(
    ngMock.inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    })
  );

  describe('throws an error', () => {
    it('when the element is a button', () => {
      const html = `<button kbn-accessible-click></button>`;
      expect(() => {
        $compile(html)($rootScope);
      }).to.throwError(/kbnAccessibleClick doesn't need to be used on a button./);
    });

    it('when the element is a link with an href', () => {
      const html = `<a href="#" kbn-accessible-click></a>`;
      expect(() => {
        $compile(html)($rootScope);
      }).to.throwError(
        /kbnAccessibleClick doesn't need to be used on a link if it has a href attribute./
      );
    });

    it(`when the element doesn't have an ng-click`, () => {
      const html = `<div kbn-accessible-click></div>`;
      expect(() => {
        $compile(html)($rootScope);
      }).to.throwError(/kbnAccessibleClick requires ng-click to be defined on its element./);
    });
  });

  describe(`doesn't throw an error`, () => {
    it('when the element is a link without an href', () => {
      const html = `<a ng-click="noop" kbn-accessible-click></a>`;
      expect(() => {
        $compile(html)($rootScope);
      }).not.to.throwError();
    });
  });

  describe('adds accessibility attributes', () => {
    it('tabindex', () => {
      const html = `<div ng-click="noop" kbn-accessible-click></div>`;
      const element = $compile(html)($rootScope);
      expect(element.attr('tabindex')).to.be('0');
    });

    it('role', () => {
      const html = `<div ng-click="noop" kbn-accessible-click></div>`;
      const element = $compile(html)($rootScope);
      expect(element.attr('role')).to.be('button');
    });
  });

  describe(`doesn't override pre-existing accessibility attributes`, () => {
    it('tabindex', () => {
      const html = `<div ng-click="noop" kbn-accessible-click tabindex="1"></div>`;
      const element = $compile(html)($rootScope);
      expect(element.attr('tabindex')).to.be('1');
    });

    it('role', () => {
      const html = `<div ng-click="noop" kbn-accessible-click role="submit"></div>`;
      const element = $compile(html)($rootScope);
      expect(element.attr('role')).to.be('submit');
    });
  });

  describe(`calls ng-click`, () => {
    let scope;
    let element;

    beforeEach(function () {
      scope = $rootScope.$new();
      scope.handleClick = sinon.stub();
      const html = `<div ng-click="handleClick()" kbn-accessible-click></div>`;
      element = $compile(html)(scope);
    });

    it(`on ENTER keyup`, () => {
      const e = angular.element.Event('keyup'); // eslint-disable-line new-cap
      e.keyCode = keyCodes.ENTER;
      element.trigger(e);
      sinon.assert.calledOnce(scope.handleClick);
    });

    it(`on SPACE keyup`, () => {
      const e = angular.element.Event('keyup'); // eslint-disable-line new-cap
      e.keyCode = keyCodes.SPACE;
      element.trigger(e);
      sinon.assert.calledOnce(scope.handleClick);
    });
  });
});
