import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import _ from 'lodash';
import 'ui/directives/kbn_editable_field';

describe('kbnEditableField Directive', function () {
  let $compile;
  let $rootScope;
  let $timeout;
  let element;
  let $el;
  let selectedEl;
  let selectedText;
  const testObj = {
    a: {
      b: {
        c: {
          val: 'Initialvalue',
          reset: 'Resetvalue'
        }
      }
    }
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_, _$timeout_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $timeout = _$timeout_;

    $el = $('<div>');
    $el.appendTo('body');
  }));

  afterEach(function () {
    $el.remove();
    $el = null;
  });

  function renderEl(html, scopeObj = testObj) {
    _.assign($rootScope, scopeObj);
    const angularElem = angular.element(html);
    element = $compile(angularElem)($rootScope);
    element.appendTo($el);
    $rootScope.$digest();
    return [element, angularElem.controller('kbnEditField')];
  }


  it('should make the proper markup with proper values', function () {
    const el = renderEl('<div kbn-edit-field="a.b.c.val" initial-val"{{a.b.c.initial}}"></div>')[0];
    const children = el.children();
    expect(children.length).to.equal(4);
    const $input  = children.filter('input');
    expect($input.length).to.equal(1);
    expect($input.val()).to.equal(testObj.a.b.c.val);
  });

  describe('it should have a controller with proper functions', function () {
    it('it should set and get the input value', function () {
      const ret = renderEl('<div kbn-edit-field="a.b.c.val" initial-val"{{a.b.c.initial}}"></div>');
      const ctrl = ret[1];
      const $input = ret[0].find('input');
      expect(ctrl.input()).to.equal($input.val());
      expect(ctrl.input()).to.equal(testObj.a.b.c.val);
      const diffVal = 'new value';
      ctrl.input(diffVal);
      expect(ctrl.input()).to.equal(diffVal);
      expect(ctrl.input()).to.equal($input.val());
    });

    it('set and get the model value', function () {
      const ret = renderEl('<div kbn-edit-field="a.b.c.val" initial-val"{{a.b.c.initial}}"></div>');
      const ctrl = ret[1];
      expect(ctrl.model()).to.equal(testObj.a.b.c.val);
      expect(ctrl.model()).to.equal($rootScope.a.b.c.val);
      const newVal = 'test value';
      ctrl.model(newVal);
      expect(ctrl.model()).to.equal($rootScope.a.b.c.val);
      expect(ctrl.model()).to.equal(newVal);
    });

    it('set and get the model value with non nested values', function () {
      const scopeObj = { val: 'foo', initial: 'first' };
      const ret = renderEl('<div kbn-edit-field="val" initial-val"{{initial}}"></div>', scopeObj);
      const ctrl = ret[1];
      expect(ctrl.model()).to.equal(scopeObj.val);
      expect(ctrl.model()).to.equal($rootScope.val);
      const newVal = 'test value';
      ctrl.model(newVal);
      expect(ctrl.model()).to.equal($rootScope.val);
      expect(ctrl.model()).to.equal(newVal);
    });

    it('should add an editing class when the the input val is different from the model', function () {
      const ret = renderEl('<div kbn-edit-field="a.b.c.val" initial-val"{{a.b.c.initial}}"></div>');
      const ctrl = ret[1];
      const $el = ret[0];
      const $input = $el.children('input');
      expect($el.hasClass('editing')).to.be(false);
      const newVal = 'another one';
      $input.val(newVal);
      ctrl.toggleEditClass();
      expect($el.hasClass('editing')).to.be(true);
    });
    it('should blur the input on command', function () {
      const ret = renderEl('<div kbn-edit-field="a.b.c.val" initial-val"{{a.b.c.initial}}"></div>');
      const ctrl = ret[1];
      const $el = ret[0];
      const $input = $el.children('input');
      expect(document.activeElement).to.be(document.body);
      $input.focus();
      expect(document.activeElement).to.be($input[0]);
      ctrl.blurInput();
      expect(document.activeElement).to.be(document.body);
    });
  });
});
