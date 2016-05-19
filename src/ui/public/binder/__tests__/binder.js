import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import Binder from 'ui/binder';
import $ from 'jquery';

describe('Binder class', function () {
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($rootScope) {
    $scope = $rootScope.$new();
  }));

  context('Constructing with a $scope', function () {
    it('accepts a $scope and listens for $destroy', function () {
      sinon.stub($scope, '$on');
      let binder = new Binder($scope);
      expect($scope.$on.callCount).to.be(1);
      expect($scope.$on.args[0][0]).to.be('$destroy');
    });

    it('unbinds when the $scope is destroyed', function () {
      let binder = new Binder($scope);
      sinon.stub(binder, 'destroy');
      $scope.$destroy();
      expect(binder.destroy.callCount).to.be(1);
    });
  });

  describe('Binder#on', function () {
    it('binds to normal event emitters', function () {
      let binder = new Binder();
      let emitter = {
        on: sinon.stub(),
        removeListener: sinon.stub()
      };
      let handler = sinon.stub();

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
      let binder = new Binder();
      let el = document.createElement('div');
      let handler = sinon.stub();

      binder.jqOn(el, 'click', handler);
      $(el).click();
      expect(handler.callCount).to.be(1);
      binder.destroy();
      $(el).click();
      expect(handler.callCount).to.be(1);
    });
  });
});
