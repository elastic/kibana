var $ = require('jquery');
var sinon = require('auto-release-sinon');
var expect = require('expect.js');
var ngMock = require('ngMock');

var Binder = require('ui/Binder');

describe('Binder class', function () {
  var $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($rootScope) {
    $scope = $rootScope.$new();
  }));

  context('Constructing with a $scope', function () {
    it('accepts a $scope and listens for $destroy', function () {
      sinon.stub($scope, '$on');
      var binder = new Binder($scope);
      expect($scope.$on.callCount).to.be(1);
      expect($scope.$on.args[0][0]).to.be('$destroy');
    });

    it('unbinds when the $scope is destroyed', function () {
      var binder = new Binder($scope);
      sinon.stub(binder, 'destroy');
      $scope.$destroy();
      expect(binder.destroy.callCount).to.be(1);
    });
  });

  describe('Binder#on', function () {
    it('binds to normal event emitters', function () {
      var binder = new Binder();
      var emitter = {
        on: sinon.stub(),
        removeListener: sinon.stub()
      };
      var handler = sinon.stub();

      binder.on(emitter, 'click', handler);
      expect(emitter.on.callCount).to.be(1);
      expect(emitter.on.args[0][0]).to.be('click');
      expect(emitter.on.args[0][1]).to.be(handler);

      binder.destroy();
      expect(emitter.removeListener.callCount).to.be(1);
      expect(emitter.removeListener.args[0][0]).to.be('click');
      expect(emitter.removeListener.args[0][1]).to.be(handler);
    });
  });

  describe('Binder#jqOn', function () {
    it('binds jquery event handlers', function () {
      var binder = new Binder();
      var el = document.createElement('div');
      var handler = sinon.stub();

      binder.jqOn(el, 'click', handler);
      $(el).click();
      expect(handler.callCount).to.be(1);
      binder.destroy();
      $(el).click();
      expect(handler.callCount).to.be(1);
    });
  });
});
