import ngMock from 'ng_mock';
import expect from 'expect.js';
import { assign } from 'lodash';
import $ from 'jquery';

describe('Config Directive', function () {

  var build = function () {};
  let $testScope = null;

  beforeEach(ngMock.module('kibana', function ($compileProvider) {
    var renderCount = 0;
    $compileProvider.directive('renderCounter', function () {
      return {
        link: function ($scope, $el) {
          $el.html(++renderCount);
        }
      };
    });
  }));

  beforeEach(ngMock.inject(function ($compile, $rootScope) {

    build = function (scopeVars) {
      var $el = $('<kbn-top-nav>');
      $testScope = $rootScope.$new();
      assign($testScope, scopeVars || {});
      $compile($el)($testScope);
      $testScope.$digest();
      return $el;
    };

  }));

  it('sets the proper functions on the kbnTopNav prop on scope', function () {
    var $config = build();
    expect($testScope.kbnTopNav.open).to.be.a(Function);
    expect($testScope.kbnTopNav.close).to.be.a(Function);
    expect($testScope.kbnTopNav.is).to.be.a(Function);
    expect($testScope.kbnTopNav.toggle).to.be.a(Function);
  });
});
