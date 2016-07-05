import angular from 'angular';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

let init;
let $rootScope;
let $compile;

describe('draggable_* directives', function () {

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');
    init = function init(markup = '') {
      const $parentScope = $rootScope.$new();
      $parentScope.items = [
        { name: 'item_1' },
        { name: 'item_2' },
        { name: 'item_3' }
      ];

      // create the markup
      const $elem = angular.element(`<div draggable-container="items">`);
      $elem.html(markup);

      // compile the directive
      $compile($elem)($parentScope);
      $parentScope.$apply();

      const $scope = $elem.scope();

      return { $parentScope, $scope, $elem };
    };
  }));

  describe('draggable_container directive', function () {
    it('should expose the drake', function () {
      const { $scope } = init();
      expect($scope.drake).to.be.an(Object);
    });

    it('should expose the controller', function () {
      const { $scope } = init();
      expect($scope.draggableContainerCtrl).to.be.an(Object);
    });

    it('should pull item list from directive attribute', function () {
      const { $scope, $parentScope } = init();
      expect($scope.draggableContainerCtrl.getList()).to.eql($parentScope.items);
    });

    it('should not be able to move extraneous DOM elements', function () {
      const bare = angular.element(`<div>`);
      const { $scope } = init();
      expect($scope.drake.canMove(bare[0])).to.eql(false);
    });

    it('should not be able to move non-[draggable-item] elements', function () {
      const bare = angular.element(`<div>`);
      const { $scope, $elem } = init();
      $elem.append(bare);
      expect($scope.drake.canMove(bare[0])).to.eql(false);
    });

    it('shouldn\'t be able to move extraneous [draggable-item] elements', function () {
      const anotherParent = angular.element(`<div draggable-container="items">`);
      const item = angular.element(`<div draggable-item="items[0]">`);
      const scope = $rootScope.$new();
      anotherParent.append(item);
      $compile(anotherParent)(scope);
      $compile(item)(scope);
      scope.$apply();
      const { $scope } = init();
      expect($scope.drake.canMove(item[0])).to.eql(false);
    });

    it('shouldn\'t be able to move [draggable-item] if it has a handle', function () {
      const { $scope, $elem } = init(`
        <div draggable-item="items[0]">
          <div draggable-handle></div>
        </div>
      `);
      const item = $elem.find(`[draggable-item]`);
      expect($scope.drake.canMove(item[0])).to.eql(false);
    });

    it('should be able to move [draggable-item] by its handle', function () {
      const { $scope, $elem } = init(`
        <div draggable-item="items[0]">
          <div draggable-handle></div>
        </div>
      `);
      const handle = $elem.find(`[draggable-handle]`);
      expect($scope.drake.canMove(handle[0])).to.eql(true);
    });
  });

  describe('draggable_item', function () {
    it('should be required to be a child to [draggable-container]', function () {
      const item = angular.element(`<div draggable-item="items[0]">`);
      const scope = $rootScope.$new();
      expect(() => {
        $compile(item)(scope);
        scope.$apply();
      }).to.throwException(/controller(.+)draggableContainer(.+)required/i);
    });
  });

  describe('draggable_handle', function () {
    it('should be required to be a child to [draggable-item]', function () {
      const handle = angular.element(`<div draggable-handle>`);
      const scope = $rootScope.$new();
      expect(() => {
        $compile(handle)(scope);
        scope.$apply();
      }).to.throwException(/controller(.+)draggableItem(.+)required/i);
    });
  });
});
