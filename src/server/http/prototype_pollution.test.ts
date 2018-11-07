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

import { IncomingMessage } from 'http';
import { setupPrototypePollutionValidation } from './prototype_pollution';

// we need to grab a reference to the function that is added
// with server.ext('onPostAuth', fn) so we can emulate the payload
const getHandler = () => {
  const mockServer = {
    ext: jest.fn(),
  };
  setupPrototypePollutionValidation(mockServer as any);
  expect(mockServer.ext).toHaveBeenCalledWith('onPostAuth', expect.anything());
  return mockServer.ext.mock.calls[0][1];
};

const createMockH = () => {
  return {
    continue: Symbol(),
  };
};

const expectSuccess = (obj: any) => {
  const handler = getHandler();
  const mockH = createMockH();
  const result = handler(obj, mockH);
  expect(result).toBe(mockH.continue);
};

const expectFailure = (obj: any) => {
  const handler = getHandler();
  const mockH = createMockH();
  expect(() => handler(obj, mockH)).toThrowErrorMatchingSnapshot();
};

// to ensure we're ignoring incoming messages, we're creating a circular dependency
// and ensuring that we're still getting a success
test(`ignores IncomingMessage`, () => {
  const message = new IncomingMessage(null as any);
  message.socket = message as any;
  expectSuccess({
    payload: message,
  });
});

test(`fails on circular references`, () => {
  const foo: Record<string, any> = {};
  foo.myself = foo;

  expectFailure({
    payload: foo,
  });
});

[
  {
    foo: true,
    bar: '__proto__',
    baz: 1.1,
    qux: undefined,
    quux: () => null,
    quuz: Object.create(null),
  },
  {
    foo: {
      foo: true,
      bar: '__proto__',
      baz: 1.1,
      qux: undefined,
      quux: () => null,
      quuz: Object.create(null),
    },
  },
  { constructor: { foo: { prototype: null } } },
  { prototype: { foo: { constructor: null } } },
].forEach(value => {
  ['headers', 'payload', 'query', 'params'].forEach(property => {
    const obj = {
      [property]: value,
    };
    test(`can submit ${JSON.stringify(obj)}`, () => {
      expectSuccess(obj);
    });
  });
});

// if we use the object literal syntax to create the following values, we end up
// actually reassigning the __proto__ which makes it be a non-enumerable not-own property
// which isn't what we want to test here
[
  JSON.parse(`{ "__proto__": null }`),
  JSON.parse(`{ "foo": { "__proto__": true } }`),
  JSON.parse(`{ "foo": { "bar": { "__proto__": {} } } }`),
  JSON.parse(`{ "constructor": { "prototype" : null } }`),
  JSON.parse(`{ "foo": { "constructor": { "prototype" : null } } }`),
  JSON.parse(`{ "foo": { "bar": { "constructor": { "prototype" : null } } } }`),
].forEach(value => {
  ['headers', 'payload', 'query', 'params'].forEach(property => {
    const obj = {
      [property]: value,
    };
    test(`can't submit ${JSON.stringify(obj)}`, () => {
      expectFailure(obj);
    });
  });
});
