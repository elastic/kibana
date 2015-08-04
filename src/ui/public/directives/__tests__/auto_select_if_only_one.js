
var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
require('ui/directives/auto_select_if_only_one');

describe('Auto-select if only one directive', function () {
  var $compile;
  var $rootScope;
  var zeroOptions = [];
  var oneOption = [{label: 'foo'}];
  var multiOptions = [{label: 'foo'}, {label: 'bar'}];

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    var html = '<select ng-model="value" ng-options="option.name for option in options" auto-select-if-only-one="options"></select>';
    $compile(html)($rootScope);
    $rootScope.value = null;
  }));

  it('should not auto-select if there are no options', function () {
    $rootScope.options = zeroOptions;
    $rootScope.$digest();
    expect($rootScope.value).to.not.be.ok();
  });

  it('should not auto-select if there are multiple options', function () {
    $rootScope.options = multiOptions;
    $rootScope.$digest();
    expect($rootScope.value).to.not.be.ok();
  });

  it('should auto-select if there is only one option', function () {
    $rootScope.options = oneOption;
    $rootScope.$digest();
    expect($rootScope.value).to.be(oneOption[0]);
  });

  it('should still auto select if the collection contains 2 items but is filtered to 1', function () {
    $rootScope.options = multiOptions;
    var html = '<select ng-model="value" ng-options="option.name for option in options | filter:{label:\'bar\'}" ' +
    'auto-select-if-only-one="options | filter:{label:\'bar\'}"></select>';
    $compile(html)($rootScope);
    $rootScope.value = null;
    $rootScope.$digest();

    expect($rootScope.value).to.be(multiOptions[1]);
  });
});
