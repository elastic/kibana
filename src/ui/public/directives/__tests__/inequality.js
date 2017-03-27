import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/inequality';

describe('greater_than model validator directive', function () {
  let $compile;
  let $rootScope;
  let html;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  // no value is the same as 0
  describe('without value', function () {
    let element;
    beforeEach(function () {
      html = '<input type="text" ng-model="value" greater-than />';
      element = $compile(html)($rootScope);
    });

    it('should be valid when larger than 0', function () {
      $rootScope.value = '1';
      $rootScope.$digest();
      expect(element.hasClass('ng-valid')).to.be.ok();
    });

    it('should be valid for 0', function () {
      $rootScope.value = '0';
      $rootScope.$digest();
      expect(element.hasClass('ng-valid')).to.be.ok();
    });

    it('should be valid for negatives', function () {
      $rootScope.value = '-10';
      $rootScope.$digest();
      expect(element.hasClass('ng-valid')).to.be.ok();
    });
  });

  [0, 1, 10, 42, -12].forEach(function (num) {
    describe('with value ' + num, function () {
      let element;
      beforeEach(function () {
        html = '<input type="text" ng-model="value" greater-than="' + num + '" />';
        element = $compile(html)($rootScope);
      });

      it('should be valid when larger than ' + num, function () {
        $rootScope.value = num + 1;
        $rootScope.$digest();
        expect(element.hasClass('ng-valid')).to.be.ok();
      });

      it('should be invalid for ' + num, function () {
        $rootScope.value = num;
        $rootScope.$digest();
        expect(element.hasClass('ng-invalid')).to.be.ok();
      });

      it('should be invalid for less than ' + num, function () {
        $rootScope.value = num - 1;
        $rootScope.$digest();
        expect(element.hasClass('ng-invalid')).to.be.ok();
      });
    });
  });

});
