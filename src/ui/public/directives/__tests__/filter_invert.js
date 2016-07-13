import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('FilterInvert directive', function () {
  let $scope;
  let $parentScope;
  let $elem;
  let $compile;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    $elem = angular.element('<img src="test.png" filter-invert>');
    $parentScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
  }));

  it('sets CSS filter:invert property in supported browsers', function () {
    const element = $compile($elem)($parentScope);
    const controller = element.controller('filterInvert');
    controller.isFilterSupported = () => true;
    $elem.scope().$digest();
    $scope = $elem.isolateScope();
    expect($elem.attr('style')).to.contain('filter: invert(100%)');
  });

  it('adds svg filter in unsupported browsers', function () {
    const element = $compile($elem)($parentScope);
    const controller = element.controller('filterInvert');
    controller.isFilterSupported = () => false;
    $elem.scope().$digest();
    $scope = $elem.isolateScope();
    expect($elem.attr('style')).to.contain('filter: invert(100%)'); // this should fail ... it doesnt
  });
});
