import sinon from 'sinon';
import expect from 'expect.js';

import { serverExtensionsMixin } from '../server_extensions_mixin';

describe('server.addMemoizedFactoryToRequest()', () => {
  const setup = () => {
    class Request {}

    class Server {
      constructor() {
        sinon.spy(this, 'decorate');
      }
      decorate(type, name, value) {
        switch (type) {
          case 'request': return Request.prototype[name] = value;
          case 'server': return Server.prototype[name] = value;
          default: throw new Error(`Unexpected decorate type ${type}`);
        }
      }
    }

    const server = new Server();
    serverExtensionsMixin({}, server);
    return { server, Request };
  };

  it('throws when propertyName is not a string', () => {
    const { server } = setup();
    expect(() => server.addMemoizedFactoryToRequest()).to.throwError('propertyName must be a string');
    expect(() => server.addMemoizedFactoryToRequest(null)).to.throwError('propertyName must be a string');
    expect(() => server.addMemoizedFactoryToRequest(1)).to.throwError('propertyName must be a string');
    expect(() => server.addMemoizedFactoryToRequest(true)).to.throwError('propertyName must be a string');
    expect(() => server.addMemoizedFactoryToRequest(/abc/)).to.throwError('propertyName must be a string');
    expect(() => server.addMemoizedFactoryToRequest(['foo'])).to.throwError('propertyName must be a string');
    expect(() => server.addMemoizedFactoryToRequest([1])).to.throwError('propertyName must be a string');
    expect(() => server.addMemoizedFactoryToRequest({})).to.throwError('propertyName must be a string');
  });

  it('throws when factory is not a function', () => {
    const { server } = setup();
    expect(() => server.addMemoizedFactoryToRequest('name')).to.throwError('factory must be a function');
    expect(() => server.addMemoizedFactoryToRequest('name', null)).to.throwError('factory must be a function');
    expect(() => server.addMemoizedFactoryToRequest('name', 1)).to.throwError('factory must be a function');
    expect(() => server.addMemoizedFactoryToRequest('name', true)).to.throwError('factory must be a function');
    expect(() => server.addMemoizedFactoryToRequest('name', /abc/)).to.throwError('factory must be a function');
    expect(() => server.addMemoizedFactoryToRequest('name', ['foo'])).to.throwError('factory must be a function');
    expect(() => server.addMemoizedFactoryToRequest('name', [1])).to.throwError('factory must be a function');
    expect(() => server.addMemoizedFactoryToRequest('name', {})).to.throwError('factory must be a function');
  });

  it('throws when factory takes more than one arg', () => {
    const { server } = setup();
    /* eslint-disable no-unused-vars */
    expect(() => server.addMemoizedFactoryToRequest('name', () => {})).to.not.throwError('more than one argument');
    expect(() => server.addMemoizedFactoryToRequest('name', (a) => {})).to.not.throwError('more than one argument');

    expect(() => server.addMemoizedFactoryToRequest('name', (a, b) => {})).to.throwError('more than one argument');
    expect(() => server.addMemoizedFactoryToRequest('name', (a, b, c) => {})).to.throwError('more than one argument');
    expect(() => server.addMemoizedFactoryToRequest('name', (a, b, c, d) => {})).to.throwError('more than one argument');
    expect(() => server.addMemoizedFactoryToRequest('name', (a, b, c, d, e) => {})).to.throwError('more than one argument');
    /* eslint-enable no-unused-vars */
  });

  it('decorates request objects with a function at `propertyName`', () => {
    const { server, Request } = setup();

    expect(new Request()).to.not.have.property('decorated');
    server.addMemoizedFactoryToRequest('decorated', () => {});
    expect(new Request()).to.have.property('decorated').a('function');
  });

  it('caches invocations of the factory to the request instance', () => {
    const { server, Request } = setup();
    const factory = sinon.stub().returnsArg(0);
    server.addMemoizedFactoryToRequest('foo', factory);

    const request1 = new Request();
    const request2 = new Request();

    // call `foo()` on both requests a bunch of times, each time
    // the return value should be exactly the same
    expect(request1.foo()).to.be(request1);
    expect(request1.foo()).to.be(request1);
    expect(request1.foo()).to.be(request1);
    expect(request1.foo()).to.be(request1);
    expect(request1.foo()).to.be(request1);
    expect(request1.foo()).to.be(request1);

    expect(request2.foo()).to.be(request2);
    expect(request2.foo()).to.be(request2);
    expect(request2.foo()).to.be(request2);
    expect(request2.foo()).to.be(request2);

    // only two different requests, so factory should have only been
    // called twice with the two request objects
    sinon.assert.calledTwice(factory);
    sinon.assert.calledWithExactly(factory, request1);
    sinon.assert.calledWithExactly(factory, request2);
  });
});
