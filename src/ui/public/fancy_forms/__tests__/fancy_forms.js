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

  describe('ngModelController', function () {
    it('gives access to the ngFormController', function () {
      expect(ngModel.$getForm()).to.be(ngForm);
    });

    it('allows setting the model dirty', function () {
      expect($el.find('input.ng-dirty')).to.have.length(0);
      ngModel.$setDirty();
      expect($el.find('input.ng-dirty')).to.have.length(1);
    });

    it('sets the model dirty when it moves from valid to invalid', function () {
      // clear out the old scope/el
      $scope.$destroy();
      $el = generateEl();
      $scope = $rootScope.$new();

      // start with a valid value
      $scope.val = 'something';
      $compile($el)($scope);
      $rootScope.$apply();

      // ensure that the field is valid and pristinve
      var $valid = $el.find('input.ng-valid');
      expect($valid).to.have.length(1);
      expect($valid.hasClass('ng-pristine')).to.be(true);
      expect($valid.hasClass('ng-dirty')).to.be(false);

      // remove the value without actually setting the view model
      $scope.val = null;
      $rootScope.$apply();

      // ensure that the field is now invalid and dirty
      var $invalid = $el.find('input.ng-invalid');
      expect($invalid).to.have.length(1);
      expect($valid.hasClass('ng-pristine')).to.be(false);
      expect($valid.hasClass('ng-dirty')).to.be(true);
    });
  });
});
