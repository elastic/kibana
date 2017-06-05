import angular from 'angular';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import '../kbn_accessible_click';
import {
  ENTER_KEY,
  SPACE_KEY,
} from 'ui_framework/services';

describe('kbnAccessibleClick directive', () => {
  let $compile;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

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
      }).to.throwError(/kbnAccessibleClick doesn't need to be used on a link if it has a href attribute./);
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
      e.keyCode = ENTER_KEY;
      element.trigger(e);
      sinon.assert.calledOnce(scope.handleClick);
    });

    it(`on SPACE keyup`, () => {
      const e = angular.element.Event('keyup'); // eslint-disable-line new-cap
      e.keyCode = SPACE_KEY;
      element.trigger(e);
      sinon.assert.calledOnce(scope.handleClick);
    });
  });
});
