
import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/private';
import { EventsProvider } from 'ui/events';

describe('Events', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let Events;
  let Promise;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    Promise = $injector.get('Promise');
    Events = Private(EventsProvider);
  }));

  it('should handle on events', function () {
    const obj = new Events();
    const prom = obj.on('test', function (message) {
      expect(message).to.equal('Hello World');
    });

    obj.emit('test', 'Hello World');

    return prom;
  });

  it('should work with inherited objects', function () {
    _.class(MyEventedObject).inherits(Events);
    function MyEventedObject() {
      MyEventedObject.Super.call(this);
    }
    const obj = new MyEventedObject();

    const prom = obj.on('test', function (message) {
      expect(message).to.equal('Hello World');
    });

    obj.emit('test', 'Hello World');

    return prom;
  });

  it('should clear events when off is called', function () {
    const obj = new Events();
    obj.on('test', _.noop);
    expect(obj._listeners).to.have.property('test');
    expect(obj._listeners.test).to.have.length(1);
    obj.off();
    expect(obj._listeners).to.not.have.property('test');
  });

  it('should clear a specific handler when off is called for an event', function () {
    const obj = new Events();
    const handler1 = sinon.stub();
    const handler2 = sinon.stub();
    obj.on('test', handler1);
    obj.on('test', handler2);
    expect(obj._listeners).to.have.property('test');
    obj.off('test', handler1);

    return obj.emit('test', 'Hello World')
    .then(function () {
      sinon.assert.calledOnce(handler2);
      sinon.assert.notCalled(handler1);
    });
  });

  it('should clear a all handlers when off is called for an event', function () {
    const obj = new Events();
    const handler1 = sinon.stub();
    obj.on('test', handler1);
    expect(obj._listeners).to.have.property('test');
    obj.off('test');
    expect(obj._listeners).to.not.have.property('test');

    return obj.emit('test', 'Hello World')
    .then(function () {
      sinon.assert.notCalled(handler1);
    });
  });

  it('should handle multiple identical emits in the same tick', function () {
    const obj = new Events();
    const handler1 = sinon.stub();

    obj.on('test', handler1);
    const emits = [
      obj.emit('test', 'one'),
      obj.emit('test', 'two'),
      obj.emit('test', 'three')
    ];

    return Promise
    .all(emits)
    .then(function () {
      expect(handler1.callCount).to.be(emits.length);
      expect(handler1.getCall(0).calledWith('one')).to.be(true);
      expect(handler1.getCall(1).calledWith('two')).to.be(true);
      expect(handler1.getCall(2).calledWith('three')).to.be(true);
    });
  });

  it('should handle emits from the handler', function () {
    const obj = new Events();
    const secondEmit = Promise.defer();
    const handler1 = sinon.spy(function () {
      if (handler1.calledTwice) {
        return;
      }
      obj.emit('test').then(_.bindKey(secondEmit, 'resolve'));
    });

    obj.on('test', handler1);

    return Promise
    .all([
      obj.emit('test'),
      secondEmit.promise
    ])
    .then(function () {
      expect(handler1.callCount).to.be(2);
    });
  });

  it('should only emit to handlers registered before emit is called', function () {
    const obj = new Events();
    const handler1 = sinon.stub();
    const handler2 = sinon.stub();

    obj.on('test', handler1);
    const emits = [
      obj.emit('test', 'one'),
      obj.emit('test', 'two'),
      obj.emit('test', 'three')
    ];


    return Promise.all(emits).then(function () {
      expect(handler1.callCount).to.be(emits.length);

      obj.on('test', handler2);

      const emits2 = [
        obj.emit('test', 'four'),
        obj.emit('test', 'five'),
        obj.emit('test', 'six')
      ];

      return Promise.all(emits2)
      .then(function () {
        expect(handler1.callCount).to.be(emits.length + emits2.length);
        expect(handler2.callCount).to.be(emits2.length);
      });
    });
  });

  it('should pass multiple arguments from the emitter', function () {
    const obj = new Events();
    const handler = sinon.stub();
    const payload = [
      'one',
      { hello: 'tests' },
      null
    ];

    obj.on('test', handler);

    return obj.emit('test', payload[0], payload[1], payload[2])
    .then(function () {
      expect(handler.callCount).to.be(1);
      expect(handler.calledWithExactly(payload[0], payload[1], payload[2])).to.be(true);
    });
  });

  it('should preserve the scope of the handler', function () {
    const obj = new Events();
    const expected = 'some value';
    let testValue;

    function handler() {
      testValue = this.getVal();
    }
    handler.getVal = _.constant(expected);

    obj.on('test', handler);
    return obj.emit('test')
    .then(function () {
      expect(testValue).to.equal(expected);
    });
  });

  it('should always emit in the same order', function () {
    const handler = sinon.stub();

    const obj = new Events();
    obj.on('block', _.partial(handler, 'block'));
    obj.on('last', _.partial(handler, 'last'));

    return Promise
    .all([
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('block'),
      obj.emit('last')
    ])
    .then(function () {
      expect(handler.callCount).to.be(10);
      handler.args.forEach(function (args, i) {
        expect(args[0]).to.be(i < 9 ? 'block' : 'last');
      });
    });
  });
});
