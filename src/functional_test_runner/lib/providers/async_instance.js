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

const createdInstanceProxies = new WeakSet();

export const isAsyncInstance = val =>(
  createdInstanceProxies.has(val)
);

export const createAsyncInstance = (type, name, promiseForValue) => {
  let finalValue;

  const initPromise = promiseForValue.then(v => finalValue = v);
  const initFn = () => initPromise;

  const assertReady = desc => {
    if (!finalValue) {
      throw new Error(`
        ${type} \`${desc}\` is loaded asynchronously but isn't available yet. Either await the
        promise returned from ${name}.init(), or move this access into a test hook
        like \`before()\` or \`beforeEach()\`.
      `);
    }
  };

  const proxy = new Proxy({}, {
    apply(target, context, args) {
      assertReady(`${name}()`);
      return Reflect.apply(finalValue, context, args);
    },

    construct(target, args, newTarget) {
      assertReady(`new ${name}()`);
      return Reflect.construct(finalValue, args, newTarget);
    },

    defineProperty(target, prop, descriptor) {
      assertReady(`${name}.${prop}`);
      return Reflect.defineProperty(finalValue, prop, descriptor);
    },

    deleteProperty(target, prop) {
      assertReady(`${name}.${prop}`);
      return Reflect.deleteProperty(finalValue, prop);
    },

    get(target, prop, receiver) {
      if (prop === 'init') return initFn;

      assertReady(`${name}.${prop}`);
      return Reflect.get(finalValue, prop, receiver);
    },

    getOwnPropertyDescriptor(target, prop) {
      assertReady(`${name}.${prop}`);
      return Reflect.getOwnPropertyDescriptor(finalValue, prop);
    },

    getPrototypeOf() {
      assertReady(`${name}`);
      return Reflect.getPrototypeOf(finalValue);
    },

    has(target, prop) {
      if (prop === 'init') return true;

      assertReady(`${name}.${prop}`);
      return Reflect.has(finalValue, prop);
    },

    isExtensible() {
      assertReady(`${name}`);
      return Reflect.isExtensible(finalValue);
    },

    ownKeys() {
      assertReady(`${name}`);
      return Reflect.ownKeys(finalValue);
    },

    preventExtensions() {
      assertReady(`${name}`);
      return Reflect.preventExtensions(finalValue);
    },

    set(target, prop, value, receiver) {
      assertReady(`${name}.${prop}`);
      return Reflect.set(finalValue, prop, value, receiver);
    },

    setPrototypeOf(target, prototype) {
      assertReady(`${name}`);
      return Reflect.setPrototypeOf(finalValue, prototype);
    }
  });

  // add the created provider to the WeakMap so we can
  // check for it later in `isAsyncProvider()`
  createdInstanceProxies.add(proxy);

  return proxy;
};
