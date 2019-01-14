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

const INITIALIZING = Symbol('async instance initializing');
const asyncInitFns = new WeakSet();

export const isAsyncInstance = val => (
  val && asyncInitFns.has(val.init)
);

export const createAsyncInstance = (type, name, promiseForValue) => {
  let instance = INITIALIZING;

  const initPromise = promiseForValue.then(v => instance = v);
  const loadingTarget = {
    init() {
      return initPromise;
    }
  };
  asyncInitFns.add(loadingTarget.init);

  const assertReady = desc => {
    if (instance === INITIALIZING) {
      throw new Error(`
        ${type} \`${desc}\` is loaded asynchronously but isn't available yet. Either await the
        promise returned from ${name}.init(), or move this access into a test hook
        like \`before()\` or \`beforeEach()\`.
      `);
    }

    if (typeof instance !== 'object') {
      throw new TypeError(`
        ${type} \`${desc}\` is not supported because ${name} is ${typeof instance}
      `);
    }
  };

  return new Proxy(loadingTarget, {
    apply(target, context, args) {
      assertReady(`${name}()`);
      return Reflect.apply(instance, context, args);
    },

    construct(target, args, newTarget) {
      assertReady(`new ${name}()`);
      return Reflect.construct(instance, args, newTarget);
    },

    defineProperty(target, prop, descriptor) {
      assertReady(`${name}.${prop}`);
      return Reflect.defineProperty(instance, prop, descriptor);
    },

    deleteProperty(target, prop) {
      assertReady(`${name}.${prop}`);
      return Reflect.deleteProperty(instance, prop);
    },

    get(target, prop, receiver) {
      if (loadingTarget.hasOwnProperty(prop)) {
        return Reflect.get(loadingTarget, prop, receiver);
      }

      assertReady(`${name}.${prop}`);
      return Reflect.get(instance, prop, receiver);
    },

    getOwnPropertyDescriptor(target, prop) {
      if (loadingTarget.hasOwnProperty(prop)) {
        return Reflect.getOwnPropertyDescriptor(loadingTarget, prop);
      }

      assertReady(`${name}.${prop}`);
      return Reflect.getOwnPropertyDescriptor(instance, prop);
    },

    getPrototypeOf() {
      assertReady(`${name}`);
      return Reflect.getPrototypeOf(instance);
    },

    has(target, prop) {
      if (!loadingTarget.hasOwnProperty(prop)) {
        return Reflect.has(loadingTarget, prop);
      }

      assertReady(`${name}.${prop}`);
      return Reflect.has(instance, prop);
    },

    isExtensible() {
      assertReady(`${name}`);
      return Reflect.isExtensible(instance);
    },

    ownKeys() {
      assertReady(`${name}`);
      return Reflect.ownKeys(instance);
    },

    preventExtensions() {
      assertReady(`${name}`);
      return Reflect.preventExtensions(instance);
    },

    set(target, prop, value, receiver) {
      assertReady(`${name}.${prop}`);
      return Reflect.set(instance, prop, value, receiver);
    },

    setPrototypeOf(target, prototype) {
      assertReady(`${name}`);
      return Reflect.setPrototypeOf(instance, prototype);
    }
  });
};
