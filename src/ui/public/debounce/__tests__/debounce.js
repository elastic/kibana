
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { DebounceProvider } from '..';

let debounce;
let debounceFromProvider;
let $timeout;

function init() {
  ngMock.module('kibana');

  ngMock.inject(function ($injector, _$timeout_, Private) {
    $timeout = _$timeout_;

    debounce = $injector.get('debounce');
    debounceFromProvider = Private(DebounceProvider);
  });
}

describe('debounce service', function () {
  let spy;
  beforeEach(function () {
    spy = sinon.spy();
    init();
  });

  it('should have a cancel method', function () {
    const bouncer = debounce(() => {}, 100);
    const bouncerFromProvider = debounceFromProvider(() => {}, 100);

    expect(bouncer).to.have.property('cancel');
    expect(bouncerFromProvider).to.have.property('cancel');
  });

  describe('delayed execution', function () {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => sandbox.useFakeTimers());
    afterEach(() => sandbox.restore());

    it('should delay execution', function () {
      const bouncer = debounce(spy, 100);
      const bouncerFromProvider = debounceFromProvider(spy, 100);

      bouncer();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);

      spy.reset();

      bouncerFromProvider();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
    });

    it('should fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true });
      const bouncerFromProvider = debounceFromProvider(spy, 100, { leading: true });

      bouncer();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledTwice(spy);

      spy.reset();

      bouncerFromProvider();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledTwice(spy);
    });

    it('should only fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true, trailing: false });
      const bouncerFromProvider = debounceFromProvider(spy, 100, { leading: true, trailing: false });

      bouncer();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);

      spy.reset();

      bouncerFromProvider();
      sinon.assert.calledOnce(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
    });

    it('should reset delayed execution', function () {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);
      const bouncerFromProvider = debounceFromProvider(spy, 100);

      bouncer();
      sandbox.clock.tick(1);

      bouncer();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
      sinon.assert.calledOnce(cancelSpy);

      spy.reset();
      cancelSpy.reset();

      bouncerFromProvider();
      sandbox.clock.tick(1);

      bouncerFromProvider();
      sinon.assert.notCalled(spy);
      $timeout.flush();
      sinon.assert.calledOnce(spy);
      sinon.assert.calledOnce(cancelSpy);
    });
  });

  describe('cancel', function () {
    it('should cancel the $timeout', function () {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);
      const bouncerFromProvider = debounceFromProvider(spy, 100);

      bouncer();
      bouncer.cancel();
      sinon.assert.calledOnce(cancelSpy);
      // throws if pending timeouts
      $timeout.verifyNoPendingTasks();

      cancelSpy.reset();

      bouncerFromProvider();
      bouncerFromProvider.cancel();
      sinon.assert.calledOnce(cancelSpy);
      // throws if pending timeouts
      $timeout.verifyNoPendingTasks();
    });
  });
});

