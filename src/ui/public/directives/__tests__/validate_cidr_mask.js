import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/validate_cidr_mask';


describe('Validate CIDR mask directive', function () {
  let $compile;
  let $rootScope;
  const html = '<input type="text" ng-model="value" validate-cidr-mask />';

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('should allow empty input', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = '';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = null;
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = undefined;
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();
  });

  it('should allow valid CIDR masks', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = '0.0.0.0/1';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '128.0.0.1/31';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '1.2.3.4/2';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '67.129.65.201/27';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();
  });

  it('should disallow invalid CIDR masks', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = 'hello, world';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '0.0.0.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '0.0.0.0/0';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '0.0.0.0/33';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '256.0.0.0/32';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '0.0.0.0/32/32';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '1.2.3/1';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });
});
