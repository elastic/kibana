import sinon from 'sinon';
import ngMock from 'ng_mock';
import { EventsProvider } from '../events';

describe('events', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let events;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const Events = Private(EventsProvider);
    events = new Events();
  }));

  it('calls emitted handlers asynchronously', (done) => {
    const listenerStub = sinon.stub();
    events.on('test', listenerStub);
    events.emit('test');
    sinon.assert.notCalled(listenerStub);

    setTimeout(() => {
      sinon.assert.calledOnce(listenerStub);
      done();
    }, 100);
  });

  it('calling off after an emit that has not yet triggered the handler, will not call the handler', (done) => {
    const listenerStub = sinon.stub();
    events.on('test', listenerStub);
    events.emit('test');
    // It's called asynchronously so it shouldn't be called yet.
    sinon.assert.notCalled(listenerStub);
    events.off('test', listenerStub);

    setTimeout(() => {
      sinon.assert.notCalled(listenerStub);
      done();
    }, 100);
  });
});
