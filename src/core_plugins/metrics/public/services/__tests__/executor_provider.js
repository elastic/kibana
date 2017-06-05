import { expect } from 'chai';
import sinon from 'sinon';
import executorProvider from '../executor_provider';
import EventEmitter from 'events';
import Promise from 'bluebird';

describe('$executor service', () => {
  let executor;
  let timefilter;
  let $timeout;
  let onSpy;
  let offSpy;

  beforeEach(() => {

    $timeout = sinon.spy(setTimeout);
    $timeout.cancel = (id) => clearTimeout(id);

    timefilter = new EventEmitter();
    onSpy = sinon.spy((...args) => timefilter.addListener(...args));
    offSpy = sinon.spy((...args) => timefilter.removeListener(...args));

    timefilter.on = onSpy;
    timefilter.off = offSpy;

    timefilter.refreshInterval = {
      pause: false,
      value: 0
    };
    executor = executorProvider(Promise, $timeout, timefilter);
  });

  afterEach(() => executor.destroy());

  it('should register listener for fetch upon start', () => {
    executor.start();
    expect(onSpy.calledTwice).to.equal(true);
    expect(onSpy.firstCall.args[0]).to.equal('fetch');
    expect(onSpy.firstCall.args[1].name).to.equal('reFetch');
  });

  it('should register listener for update upon start', () => {
    executor.start();
    expect(onSpy.calledTwice).to.equal(true);
    expect(onSpy.secondCall.args[0]).to.equal('update');
    expect(onSpy.secondCall.args[1].name).to.equal('killIfPaused');
  });

  it('should not call $timeout if the timefilter is not paused and set to zero', () => {
    executor.start();
    expect($timeout.callCount).to.equal(0);
  });

  it('should call $timeout if the timefilter is not paused and set to 1000ms', () => {
    timefilter.refreshInterval.value = 1000;
    executor.start();
    expect($timeout.callCount).to.equal(1);
  });

  it('should execute function if ingorePause is passed (interval set to 1000ms)', (done) => {
    timefilter.refreshInterval.value = 1000;
    executor.register({ execute: () => done() });
    executor.start({ ignorePaused: true });
  });

  it('should execute function if timefilter is not paused and interval set to 1000ms', (done) => {
    timefilter.refreshInterval.value = 1000;
    executor.register({ execute: () => done() });
    executor.start();
  });

  it('should execute function multiple times', (done) => {
    let calls = 0;
    timefilter.refreshInterval.value = 10;
    executor.register({ execute: () => {
      if (calls++ > 1) done();
      return Promise.resolve();
    } });
    executor.start();
  });

  it('should call handleResponse', (done) => {
    timefilter.refreshInterval.value = 10;
    executor.register({
      execute: () => Promise.resolve(),
      handleResponse: () => done()
    });
    executor.start();
  });

  it('should call handleError', (done) => {
    timefilter.refreshInterval.value = 10;
    executor.register({
      execute: () => Promise.reject(),
      handleError: () => done()
    });
    executor.start();
  });
});
