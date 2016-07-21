var angular = require('angular');
var $ = require('jquery');
var sinon = require('sinon');
var expect = require('expect.js');
var ngMock = require('ngMock');

require('ui/directives/confirm_click');
require('plugins/kibana/discover/index');

var $parentScope;

var $scope;

var $elem;

var init = function (text) {
  // Load the application
  ngMock.module('kibana');

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
    var events;

    beforeEach(function () {
      init();
      events = $._data($elem[0], 'events');
    });

    it('should get a click handler', function (done) {
      expect(events).to.be.a(Object);
      expect(events.click).to.be.a(Array);
      done();
    });

    it('should unbind click handlers when the scope is destroyed', function (done) {
      $scope.$destroy();
      expect(events.click).to.be(undefined);
      done();
    });

  });



  describe('confirmed', function () {
    var confirmed;

    beforeEach(function () {
      init();
      confirmed = sinon.stub(window, 'confirm');
      confirmed.returns(true);
    });

    afterEach(function () {
      window.confirm.restore();
    });

    it('should trigger window.confirm when clicked', function (done) {
      $elem.click();
      expect(confirmed.called).to.be(true);
      done();
    });

    it('should run the click function when positively confirmed', function (done) {
      $elem.click();
      expect($scope.runThis.called).to.be(true);
      done();
    });

  });

  describe('not confirmed', function () {
    var confirmed;

    beforeEach(function () {
      init();
      confirmed = sinon.stub(window, 'confirm');
      confirmed.returns(false);
    });

    afterEach(function () {
      window.confirm.restore();
    });

    it('should not run the click function when canceled', function (done) {
      $elem.click();
      expect($scope.runThis.called).to.be(false);
      done();
    });

  });


});
