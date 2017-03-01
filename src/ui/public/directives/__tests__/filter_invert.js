import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('FilterInvert directive', function () {
  let $parentScope;
  let $elem;
  let $compile;
  let $controller;

  beforeEach(ngMock.module('kibana', function ($controllerProvider) {
    $controller = $controllerProvider;
  }));
  beforeEach(ngMock.inject(function ($injector) {
    $elem = angular.element('<img src="/bundles/c398c57f18e4955558703a61596db982.png" filter-invert>');
    $parentScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
  }));

  it('sets CSS filter:invert property in supported browsers', function () {
    $controller.register('filterInvertController', function () {
      this.isFilterSupported = () => true;
    });
    $compile($elem)($parentScope);
    $elem.scope().$digest();
    expect($elem.attr('style')).to.contain('filter: invert(100%)');
  });

  it('adds svg filter in unsupported browsers', function () {
    $controller.register('filterInvertController', function () {
      this.isFilterSupported = () => false;
    });
    $compile($elem)($parentScope);
    $elem.scope().$digest();
    expect($elem.attr('style')).to.contain('hidden');
  });
});
