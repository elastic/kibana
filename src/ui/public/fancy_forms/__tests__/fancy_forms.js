var $ = require('jquery');
var ngMock = require('ngMock');
var expect = require('expect.js');

describe('fancy forms', function () {
  var $el;
  var $scope;
  var $compile;
  var $rootScope;
  var ngForm;
  var ngModel;

  function generateEl() {
    return $('<form>').html(
      $('<input ng-model="val" required>')
    );
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');

    $scope = $rootScope.$new();
    $el = generateEl();

    $compile($el)($scope);
    $scope.$apply();

    ngForm = $el.controller('form');
    ngModel = $el.find('input').controller('ngModel');
  }));

  describe('ngFormController', function () {
    it('counts errors', function () {
      expect(ngForm.errorCount()).to.be(1);
    });

    it('clears errors', function () {
      $scope.val = 'someting';
      $scope.$apply();
      expect(ngForm.errorCount()).to.be(0);
    });

    it('describes 0 errors', function () {
      $scope.val = 'someting';
      $scope.$apply();
      expect(ngForm.describeErrors()).to.be('0 Errors');
    });

    it('describes 0 error when the model is invalid but untouched', function () {
      $scope.$apply();
      expect(ngForm.describeErrors()).to.be('0 Errors');
    });

    it('describes 1 error when the model is touched', function () {
      $el.find('input').blur();
      $scope.$apply();
      expect(ngForm.describeErrors()).to.be('1 Error');
    });
  });
});
