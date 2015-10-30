var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');

require('ui/filter_bar/editable_filter');

describe('Editable filter directive', function () {
  var $compile;
  var $rootScope;
  var html = '<input ng-model="value" editable-filter />';
  var element;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  beforeEach(function () {
    element = $compile(html)($rootScope);
  });

  it('should not allow empty filters', function () {
    element.val('{}');
    element.trigger('input');
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });

  it('should be able to read parse an input', function () {
    element.val('{}');
    element.trigger('input');
    expect($rootScope.value).to.eql({});
  });

  it('should not allow invalid json', function () {
    element.val('{foo}');
    element.trigger('input');
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });

  it('should allow valid json', function () {
    element.val('{"foo": "bar"}');
    element.trigger('input');
    expect($rootScope.value).to.eql({foo: 'bar'});
    expect(element.hasClass('ng-valid')).to.be.ok();
  });
});
