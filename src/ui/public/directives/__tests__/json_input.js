import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/json_input';


describe('JSON input validation', function () {
  let $compile;
  let $rootScope;
  const html = '<input ng-model="value" json-input require-keys=true />';
  let element;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  beforeEach(function () {
    element = $compile(html)($rootScope);
  });

  it('should be able to require keys', function () {
    element.val('{}');
    element.trigger('input');
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });

  it('should be able to not require keys', function () {
    const html = '<input ng-model="value" json-input require-keys=false />';
    const element = $compile(html)($rootScope);

    element.val('{}');
    element.trigger('input');
    expect(element.hasClass('ng-valid')).to.be.ok();
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
    expect($rootScope.value).to.eql({ foo: 'bar' });
    expect(element.hasClass('ng-valid')).to.be.ok();
  });
});
