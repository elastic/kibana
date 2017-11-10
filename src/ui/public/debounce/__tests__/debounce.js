
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

let debounce;
let $timeout;

function init() {
  ngMock.module('kibana');

  ngMock.inject(function ($injector, _$timeout_) {
    $timeout = _$timeout_;

    debounce = $injector.get('debounce');

    // ensure there is a clean slate before testing deferred tasks
    $timeout.flush();
  });
}

describe('debounce service', function () {
  let spy;
  beforeEach(function () {
    spy = sinon.spy(function () {});
    init();
  });

  describe('API', function () {
    it('should have a cancel method', function () {
      const bouncer = debounce(function () {}, 100);
      expect(bouncer).to.have.property('cancel');
    });
  });

  describe('delayed execution', function () {
    it('should delay execution', function () {
      const bouncer = debounce(spy, 100);
      bouncer();
      expect(spy.callCount).to.be(0);
      $timeout.flush();
      expect(spy.callCount).to.be(1);
    });

    it('should fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true });
      bouncer();
      expect(spy.callCount).to.be(1);
      $timeout.flush();
      expect(spy.callCount).to.be(2);
    });

    it('should only fire on leading edge', function () {
      const bouncer = debounce(spy, 100, { leading: true, trailing: false });
      bouncer();
      expect(spy.callCount).to.be(1);
      $timeout.flush();
      expect(spy.callCount).to.be(1);
    });

    it('should reset delayed execution', function (done) {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);
      bouncer();
      setTimeout(function () {
        bouncer();
        expect(spy.callCount).to.be(0);
        $timeout.flush();
        expect(spy.callCount).to.be(1);
        expect(cancelSpy.callCount).to.be(1);
        done();
      }, 1);
    });
  });

  describe('cancel', function () {
    it('should cancel the $timeout', function () {
      const cancelSpy = sinon.spy($timeout, 'cancel');
      const bouncer = debounce(spy, 100);
      bouncer();
      bouncer.cancel();
      expect(cancelSpy.callCount).to.be(1);
      $timeout.verifyNoPendingTasks(); // throws if pending timeouts
    });
  });
});
