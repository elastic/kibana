var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
require('ui/directives/input_whole_number');

describe('Whole number input directive', function () {
  var $compile;
  var $rootScope;
  var html = '<input type="text" ng-model="value" input-whole-number />';

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('should allow whole numbers', function () {
    var element = $compile(html)($rootScope);

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
    var element = $compile(html)($rootScope);

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
