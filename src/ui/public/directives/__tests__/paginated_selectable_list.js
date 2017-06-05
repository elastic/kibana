import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';

const objectList = [
  { title: 'apple' },
  { title: 'orange' },
  { title: 'coconut' },
  { title: 'banana' },
  { title: 'grapes' }
];

const stringList = [
  'apple',
  'orange',
  'coconut',
  'banana',
  'grapes'
];

const lists = [objectList, stringList, []];

let $scope;
let $element;
let $isolatedScope;

lists.forEach(function (list) {
  const isArrayOfObjects = list.every((item) => {
    return _.isPlainObject(item);
  });

  const init = function (arr, willFail) {
    // Load the application
    ngMock.module('kibana');

    // Create the scope
    ngMock.inject(function ($rootScope, $compile) {
      $scope = $rootScope.$new();
      $scope.perPage = 5;
      $scope.list = list;
      $scope.listProperty = isArrayOfObjects ? 'title' : undefined;
      $scope.test = function (val) { return val; };

      // Create the element
      if (willFail) {
        $element = angular.element('<paginated-selectable-list per-page="perPage" list="list"' +
           'list-property="listProperty" user-make-url="test" user-on-select="test"></paginated-selectable-list>');
      } else {
        $element = angular.element('<paginated-selectable-list per-page="perPage" list="list"' +
           'list-property="listProperty" user-make-url="test"></paginated-selectable-list>');
      }

      // And compile it
      $compile($element)($scope);

      // Fire a digest cycle
      $element.scope().$digest();

      // Grab the isolate scope so we can test it
      $isolatedScope = $element.isolateScope();
    });
  };

  describe('paginatedSelectableList', function () {
    it('should throw an error when there is no makeUrl and onSelect attribute', ngMock.inject(function ($compile, $rootScope) {
      function errorWrapper() {
        $compile(angular.element('<paginated-selectable-list></paginated-selectable-list>'))($rootScope.new());
      }
      expect(errorWrapper).to.throwError();
    }));

    it('should throw an error with both makeUrl and onSelect attributes', function () {
      function errorWrapper() {
        init(list, true);
      }
      expect(errorWrapper).to.throwError();
    });

    describe('$scope.hits', function () {
      beforeEach(function () {
        init(list);
      });

      it('should initially sort an array of objects in ascending order', function () {
        const property = $isolatedScope.listProperty;
        const sortedList = property ? _.sortBy(list, property) : _.sortBy(list);

        expect($isolatedScope.hits).to.be.an('array');

        $isolatedScope.hits.forEach(function (hit, index) {
          if (property) {
            expect(hit[property]).to.equal(sortedList[index][property]);
          } else {
            expect(hit).to.equal(sortedList[index]);
          }
        });
      });
    });

    describe('$scope.sortHits', function () {
      beforeEach(function () {
        init(list);
      });

      it('should sort an array of objects in ascending order', function () {
        const property = $isolatedScope.listProperty;
        const sortedList = property ? _.sortBy(list, property) : _.sortBy(list);

        $isolatedScope.isAscending = false;
        $isolatedScope.sortHits(list);

        expect($isolatedScope.isAscending).to.be(true);

        $isolatedScope.hits.forEach(function (hit, index) {
          if (property) {
            expect(hit[property]).to.equal(sortedList[index][property]);
          } else {
            expect(hit).to.equal(sortedList[index]);
          }
        });
      });

      it('should sort an array of objects in descending order', function () {
        const property = $isolatedScope.listProperty;
        const reversedList = property ? _.sortBy(list, property).reverse() : _.sortBy(list).reverse();

        $isolatedScope.isAscending = true;
        $isolatedScope.sortHits(list);

        expect($isolatedScope.isAscending).to.be(false);

        $isolatedScope.hits.forEach(function (hit, index) {
          if (property) {
            expect(hit[property]).to.equal(reversedList[index][property]);
          } else {
            expect(hit).to.equal(reversedList[index]);
          }
        });
      });
    });

    describe('$scope.makeUrl', function () {
      beforeEach(function () {
        init(list);
      });

      it('should return the result of the function its passed', function () {
        const property = $isolatedScope.listProperty;
        const sortedList = property ? _.sortBy(list, property) : _.sortBy(list);

        $isolatedScope.hits.forEach(function (hit, index) {
          if (property) {
            expect($isolatedScope.makeUrl(hit)[property]).to.equal(sortedList[index][property]);
          } else {
            expect($isolatedScope.makeUrl(hit)).to.equal(sortedList[index]);
          }
        });
      });
    });

    describe('$scope.onSelect', function () {
      beforeEach(function () {
        init(list);
      });

      it('should return the result of the function its passed', function () {
        const property = $isolatedScope.listProperty;
        const sortedList = property ? _.sortBy(list, property) : _.sortBy(list);

        $isolatedScope.userOnSelect = function (val) { return val; };

        $isolatedScope.hits.forEach(function (hit, index) {
          if (property) {
            expect($isolatedScope.onSelect(hit)[property]).to.equal(sortedList[index][property]);
          } else {
            expect($isolatedScope.onSelect(hit)).to.equal(sortedList[index]);
          }
        });
      });
    });
  });
});
