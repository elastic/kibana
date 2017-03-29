import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/validate_date_math';


describe('Validate date math directive', function () {
  let $compile;
  let $rootScope;
  const html = '<input type="text" ng-model="value" validate-date-math />';

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('should allow valid date math', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = 'now';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '2012-02-28';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = 'now-3d';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = 'now-3M/M';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();

    $rootScope.value = '2012-05-31||-3M/M';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();
  });

  it('should disallow invalid date math', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = 'hello, world';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = 'now+-5w';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '2012-02-31';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();

    $rootScope.value = '5/5/2005+3d';
    $rootScope.$digest();
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });

  it('should allow empty values', function () {
    const element = $compile(html)($rootScope);

    $rootScope.value = '';
    $rootScope.$digest();
    expect(element.hasClass('ng-valid')).to.be.ok();
  });
});
