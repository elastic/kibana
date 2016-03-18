import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';

var list = [
  { title: 'apple' },
  { title: 'orange' },
  { title: 'coconut' },
  { title: 'banana' },
  { title: 'grapes' }
];
var $scope;
var $element;
var $isolatedScope;

function test(val) {
  return val;
}

var init = function (arr) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {
    $scope = $rootScope.$new();
    $scope.perPage = 5;
    $scope.list = list;
    $scope.listProperty = 'title';
    $scope.test = test;

    // Create the element
    $element = angular.element('<paginated-selectable-list perPage="perPage" list="list"' +
     'list-property="listProperty" user-make-url="test" user-on-select="test"></paginated-selectable-list>');

    // And compile it
    $compile($element)($scope);

    // Fire a digest cycle
    $element.scope().$digest();

    // Grab the isolate scope so we can test it
    $isolatedScope = $element.isolateScope();
  });
};

describe('paginatedSelectableList', function () {
  describe('$scope.hits', function () {
    beforeEach(function () {
      init(list);
    });

    it('should initially sort an array of objects in ascending order', function () {
      var property = $isolatedScope.listProperty;
      var sortedList = _.sortBy(list, property);

      expect($isolatedScope.hits).to.be.an('array');

      $isolatedScope.hits.forEach(function (hit, index) {
        expect(hit[property]).to.equal(sortedList[index][property]);
      });
    });
  });

  describe('$scope.sortHits', function () {
    beforeEach(function () {
      init(list);
    });

    it('should sort an array of objects in ascending order', function () {
      var property = $isolatedScope.listProperty;
      var sortedList = _.sortBy(list, property);

      $isolatedScope.isAscending = false;
      $isolatedScope.sortHits(list);

      expect($isolatedScope.isAscending).to.be(true);

      $isolatedScope.hits.forEach(function (hit, index) {
        expect(hit[property]).to.equal(sortedList[index][property]);
      });
    });

    it('should sort an array of objects in descending order', function () {
      var property = $isolatedScope.listProperty;
      var reversedList = _.sortBy(list, property).reverse();

      $isolatedScope.isAscending = true;
      $isolatedScope.sortHits(list);

      expect($isolatedScope.isAscending).to.be(false);

      $isolatedScope.hits.forEach(function (hit, index) {
        expect(hit[property]).to.equal(reversedList[index][property]);
      });
    });
  });

  describe('$scope.makeUrl', function () {
    beforeEach(function () {
      init(list);
    });

    it('should return the result of the function its passed', function () {
      var property = $isolatedScope.listProperty;
      var sortedList = _.sortBy(list, property);

      $isolatedScope.hits.forEach(function (hit, index) {
        expect($isolatedScope.makeUrl(hit)[property]).to.equal(sortedList[index][property]);
      });
    });
  });

  describe('$scope.onSelect', function () {
    beforeEach(function () {
      init(list);
    });

    it('should return the result of the function its passed', function () {
      var property = $isolatedScope.listProperty;
      var sortedList = _.sortBy(list, property);

      $isolatedScope.hits.forEach(function (hit, index) {
        expect($isolatedScope.onSelect(hit)[property]).to.equal(sortedList[index][property]);
      });
    });
  });
});
