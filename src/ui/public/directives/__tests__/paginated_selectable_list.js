import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';

describe('paginatedSelectableList', function () {
  var list = [
    { title: 'apple' },
    { title: 'orange' },
    { title: 'coconut' },
    { title: 'banana' },
    { title: 'grapes' }
  ];
  var $controller;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$controller_) {
    $controller = _$controller_;
  }));

  describe('$scope.hits', function () {
    it('should sort and save the list to a hits array', function () {
      const $scope = { list: list, listProperty: 'title' };
      const controller = $controller('paginatedSelectableList', { $scope: $scope });

      expect($scope.hits).to.be.an('array');
      expect($scope.hits).toEqual(_.sortBy(list, 'title'));
    });
  });
});
