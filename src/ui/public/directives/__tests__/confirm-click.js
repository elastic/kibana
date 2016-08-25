import angular from 'angular';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import 'ui/directives/confirm_click';
import 'plugins/kibana/discover/index';


let $parentScope;

let $scope;

let $elem;

const init = function (text) {
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
    let events;

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
    let confirmed;

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
    let confirmed;

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
