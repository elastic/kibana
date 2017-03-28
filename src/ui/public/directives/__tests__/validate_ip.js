import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/validate_ip';


describe('Validate IP directive', function () {
  let $compile;
  let $rootScope;
  const html = '<input type="text" ng-model="value" validate-ip />';

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

  it('should allow valid IP addresses', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = '0.0.0.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '0.0.0.1';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '126.45.211.34';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '255.255.255.255';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();
  });

  it('should disallow invalid IP addresses', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = 'hello, world';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '0.0.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '256.0.0.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '-1.0.0.0';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = Number.MAX_VALUE;
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });
});
