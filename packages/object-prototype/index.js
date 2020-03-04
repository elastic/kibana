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

const functions = require('object-prototype-functions').nodejs;
const wrap = require('./lib/wrap_function');

const ObjectPrototype = Object.create(null);
const FunctionPrototype = Object.create(ObjectPrototype);

exports.ObjectPrototype = ObjectPrototype;
exports.create = () => Object.create(ObjectPrototype);
exports.assign = (...args) => Object.assign(exports.create(), ...args);

exports.FunctionPrototype = FunctionPrototype;
exports.safePrototypeFunction = safePrototypeFunction;

/**
 * ObjectPrototype
 */

const descriptors = {
  ['__proto__']: {
    get: safePrototypeFunction(function() {
      'use strict'; // eslint-disable-line strict
      return Object.getPrototypeOf(this);
    }),
    set: safePrototypeFunction(function(proto) {
      'use strict'; // eslint-disable-line strict
      Object.setPrototypeOf(this, proto);
    }),
    enumerable: false,
    configurable: true,
  },
  constructor: {
    value: undefined, // NOTE: This doesn't try to mimic the usual Object behavior
    writable: true,
    enumerable: false,
    configurable: true,
  },
};

for (const name of functions) {
  const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, name);
  descriptor.value = safePrototypeFunction(descriptor.value);
  descriptors[name] = descriptor;
}

Object.defineProperties(ObjectPrototype, descriptors);

/**
 * FunctionPrototype
 */

Object.defineProperties(FunctionPrototype, {
  length: { value: 0, writable: false, enumerable: false, configurable: true },
  name: { value: '', writable: false, enumerable: false, configurable: true },
  arguments: {
    get: safePrototypeFunction(Function.prototype.__lookupGetter__('arguments')),
    set: safePrototypeFunction(Function.prototype.__lookupSetter__('arguments')),
    enumerable: false,
    configurable: true,
  },
  caller: {
    get: safePrototypeFunction(Function.prototype.__lookupGetter__('caller')),
    set: safePrototypeFunction(Function.prototype.__lookupSetter__('caller')),
    enumerable: false,
    configurable: true,
  },
  constructor: {
    value: undefined, // NOTE: This doesn't try to mimic the usual Object behavior
    writable: true,
    enumerable: false,
    configurable: true,
  },
  apply: {
    value: safePrototypeFunction(Function.prototype.apply),
    writable: true,
    enumerable: false,
    configurable: true,
  },
  bind: {
    value: safePrototypeFunction(function bind() {
      'use strict'; // eslint-disable-line strict
      const bound = Function.prototype.bind.apply(this, arguments);
      Object.setPrototypeOf(bound, FunctionPrototype);
      return bound;
    }),
    writable: true,
    enumerable: false,
    configurable: true,
  },
  call: {
    value: safePrototypeFunction(Function.prototype.call),
    writable: true,
    enumerable: false,
    configurable: true,
  },
  toString: {
    value: safePrototypeFunction(function toString() {
      'use strict'; // eslint-disable-line strict
      // TODO: Should we really do this?
      return `function ${this.name}() { [native code] }`;
      // Alternatively we expose the normal behavior:
      // return Function.prototype.toString.apply(this, arguments)
    }),
    writable: true,
    enumerable: false,
    configurable: true,
  },

  // NOTE: I skipped overriding Function.prototype[Symbol.hasInstance] as
  // this function would only be called if `FunctionPrototype` is on the
  // right hand side of the `instaceof` operator.
});

function safePrototypeFunction(original, name) {
  const wrapped = wrap(name || original.name, original);

  // In strict mode, the expected descriptors are: length, name, prototype
  // In non-strict mode, the expected descriptors are: length, name, arguments, caller, prototype
  const descriptors = Object.getOwnPropertyDescriptors(original);
  delete descriptors.name; // will be set automatally when the function is created below
  delete descriptors.prototype; // we'll use the `wrapped` functions own `prototype` property

  Object.defineProperties(wrapped, descriptors);
  Object.setPrototypeOf(wrapped, FunctionPrototype);
  Object.setPrototypeOf(wrapped.prototype, ObjectPrototype);

  return wrapped;
}
