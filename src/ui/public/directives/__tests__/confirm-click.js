import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import 'ui/directives/confirm_click';
import 'plugins/kibana/discover/index';
import sinon from 'sinon';

let $window;

let $parentScope;

let $scope;

let $elem;

const init = function (confirm) {
  // Load the application
  ngMock.module('kibana', function ($provide) {
    $window = {
      confirm: sinon.stub().returns(confirm)
    };
    $provide.value('$window', $window);
  });

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {
    // Give us a scope
    $parentScope = $rootScope;

    // Create the element
    $elem = angular.element(
      '<a confirm-click="runThis()">runThis</a>'
    );

    // And compile it
    $compile($elem)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.scope();

    // Add a function to check the run status of.
    $scope.runThis = sinon.spy();
  });
};


describe('confirmClick directive', function () {


  describe('event handlers', function () {
    let events;

    beforeEach(function () {
      init();
      events = $._data($elem[0], 'events');
    });

    it('should get a click handler', function () {
      expect(events).to.be.a(Object);
      expect(events.click).to.be.a(Array);
    });

    it('should unbind click handlers when the scope is destroyed', function () {
      $scope.$destroy();
      expect(events.click).to.be(undefined);
    });

  });



  describe('confirmed', function () {
    beforeEach(() => init(true));

    it('should trigger window.confirm when clicked', function () {
      $elem.click();
      expect($window.confirm.called).to.be(true);
    });

    it('should run the click function when positively confirmed', function () {
      $elem.click();
      expect($scope.runThis.called).to.be(true);
    });

  });

  describe('not confirmed', function () {
    beforeEach(() => init(false));

    it('should not run the click function when canceled', function () {
      $elem.click();
      expect($scope.runThis.called).to.be(false);
    });

  });


});
