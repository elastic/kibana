/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';

import { serverExtensionsMixin } from './server_extensions_mixin';

describe('server.addMemoizedFactoryToRequest()', () => {
  const setup = () => {
    class Request {}

    class Server {
      constructor() {
        sinon.spy(this, 'decorate');
      }
      decorate(type, name, value) {
        switch (type) {
          case 'request':
            return (Request.prototype[name] = value);
          case 'server':
            return (Server.prototype[name] = value);
          default:
            throw new Error(`Unexpected decorate type ${type}`);
        }
      }
    }

    const server = new Server();
    serverExtensionsMixin({}, server);
    return { server, Request };
  };

  it('throws when propertyName is not a string', () => {
    const { server } = setup();
    expect(() => server.addMemoizedFactoryToRequest()).toThrowError('methodName must be a string');
    expect(() => server.addMemoizedFactoryToRequest(null)).toThrowError(
      'methodName must be a string'
    );
    expect(() => server.addMemoizedFactoryToRequest(1)).toThrowError('methodName must be a string');
    expect(() => server.addMemoizedFactoryToRequest(true)).toThrowError(
      'methodName must be a string'
    );
    expect(() => server.addMemoizedFactoryToRequest(/abc/)).toThrowError(
      'methodName must be a string'
    );
    expect(() => server.addMemoizedFactoryToRequest(['foo'])).toThrowError(
      'methodName must be a string'
    );
    expect(() => server.addMemoizedFactoryToRequest([1])).toThrowError(
      'methodName must be a string'
    );
    expect(() => server.addMemoizedFactoryToRequest({})).toThrowError(
      'methodName must be a string'
    );
  });

  it('throws when factory is not a function', () => {
    const { server } = setup();
    expect(() => server.addMemoizedFactoryToRequest('name')).toThrowError(
      'factory must be a function'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', null)).toThrowError(
      'factory must be a function'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', 1)).toThrowError(
      'factory must be a function'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', true)).toThrowError(
      'factory must be a function'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', /abc/)).toThrowError(
      'factory must be a function'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', ['foo'])).toThrowError(
      'factory must be a function'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', [1])).toThrowError(
      'factory must be a function'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', {})).toThrowError(
      'factory must be a function'
    );
  });

  it('throws when factory takes more than one arg', () => {
    const { server } = setup();
    /* eslint-disable no-unused-vars */
    expect(() => server.addMemoizedFactoryToRequest('name', () => {})).not.toThrowError(
      'more than one argument'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', (a) => {})).not.toThrowError(
      'more than one argument'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', (a, b) => {})).toThrowError(
      'more than one argument'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', (a, b, c) => {})).toThrowError(
      'more than one argument'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', (a, b, c, d) => {})).toThrowError(
      'more than one argument'
    );
    expect(() => server.addMemoizedFactoryToRequest('name', (a, b, c, d, e) => {})).toThrowError(
      'more than one argument'
    );
    /* eslint-enable no-unused-vars */
  });

  it('decorates request objects with a function at `propertyName`', () => {
    const { server, Request } = setup();

    expect(new Request()).not.toHaveProperty('decorated');
    server.addMemoizedFactoryToRequest('decorated', () => {});
    expect(typeof new Request().decorated).toBe('function');
  });

  it('caches invocations of the factory to the request instance', () => {
    const { server, Request } = setup();
    const factory = sinon.stub().returnsArg(0);
    server.addMemoizedFactoryToRequest('foo', factory);

    const request1 = new Request();
    const request2 = new Request();

    // call `foo()` on both requests a bunch of times, each time
    // the return value should be exactly the same
    expect(request1.foo()).toBe(request1);
    expect(request1.foo()).toBe(request1);
    expect(request1.foo()).toBe(request1);
    expect(request1.foo()).toBe(request1);
    expect(request1.foo()).toBe(request1);
    expect(request1.foo()).toBe(request1);

    expect(request2.foo()).toBe(request2);
    expect(request2.foo()).toBe(request2);
    expect(request2.foo()).toBe(request2);
    expect(request2.foo()).toBe(request2);

    // only two different requests, so factory should have only been
    // called twice with the two request objects
    sinon.assert.calledTwice(factory);
    sinon.assert.calledWithExactly(factory, request1);
    sinon.assert.calledWithExactly(factory, request2);
  });
});
