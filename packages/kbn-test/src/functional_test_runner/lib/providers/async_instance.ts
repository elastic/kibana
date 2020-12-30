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

type AsyncInstance<T> = {
  init: () => Promise<T>;
} & T;

export const isAsyncInstance = <T = unknown>(val: any): val is AsyncInstance<T> =>
  val && asyncInitFns.has(val.init);

export const createAsyncInstance = <T>(
  type: string,
  name: string,
  promiseForValue: Promise<T>
): AsyncInstance<T> => {
  let instance: T | symbol = INITIALIZING;

  const initPromise = promiseForValue.then((v) => (instance = v));
  const loadingTarget = {
    init() {
      return initPromise;
    },
  };
  asyncInitFns.add(loadingTarget.init);

  const assertReady = (desc: string) => {
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
    apply(_, context, args) {
      assertReady(`${name}()`);
      return Reflect.apply(instance as any, context, args);
    },

    construct(_, args, newTarget) {
      assertReady(`new ${name}()`);
      return Reflect.construct(instance as any, args, newTarget);
    },

    defineProperty(_, prop, descriptor) {
      if (typeof prop !== 'symbol') {
        assertReady(`${name}.${prop}`);
      }
      return Reflect.defineProperty(instance as any, prop, descriptor);
    },

    deleteProperty(_, prop) {
      if (typeof prop !== 'symbol') {
        assertReady(`${name}.${prop}`);
      }
      return Reflect.deleteProperty(instance as any, prop);
    },

    get(_, prop, receiver) {
      if (loadingTarget.hasOwnProperty(prop)) {
        return Reflect.get(loadingTarget as any, prop, receiver);
      }

      if (typeof prop !== 'symbol') {
        assertReady(`${name}.${prop}`);
      }
      return Reflect.get(instance as any, prop, receiver);
    },

    getOwnPropertyDescriptor(_, prop) {
      if (loadingTarget.hasOwnProperty(prop)) {
        return Reflect.getOwnPropertyDescriptor(loadingTarget, prop);
      }

      if (typeof prop !== 'symbol') {
        assertReady(`${name}.${prop}`);
      }
      return Reflect.getOwnPropertyDescriptor(instance as any, prop);
    },

    getPrototypeOf() {
      assertReady(`${name}`);
      return Reflect.getPrototypeOf(instance as any);
    },

    has(_, prop) {
      if (!loadingTarget.hasOwnProperty(prop)) {
        return Reflect.has(loadingTarget, prop);
      }

      if (typeof prop !== 'symbol') {
        assertReady(`${name}.${prop}`);
      }
      return Reflect.has(instance as any, prop);
    },

    isExtensible() {
      assertReady(`${name}`);
      return Reflect.isExtensible(instance as any);
    },

    ownKeys() {
      assertReady(`${name}`);
      return Reflect.ownKeys(instance as any);
    },

    preventExtensions() {
      assertReady(`${name}`);
      return Reflect.preventExtensions(instance as any);
    },

    set(_, prop, value, receiver) {
      if (typeof prop !== 'symbol') {
        assertReady(`${name}.${prop}`);
      }
      return Reflect.set(instance as any, prop, value, receiver);
    },

    setPrototypeOf(_, prototype) {
      assertReady(`${name}`);
      return Reflect.setPrototypeOf(instance as any, prototype);
    },
  }) as AsyncInstance<T>;
};
