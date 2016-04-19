import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/input_whole_number';

describe('Whole number input directive', function () {
  let $compile;
  let $rootScope;
  let html = '<input type="text" ng-model="value" input-whole-number />';

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('should allow whole numbers', function () {
    let element = $compile(html)($rootScope);

    $rootScope.value = '123';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '1.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '-5.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();
  });

  it('should disallow numbers with decimals', function () {
    let element = $compile(html)($rootScope);

    $rootScope.value = '123.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '1.2';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '-5.5';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });
});
