/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// lazyRequire.js
// Creates a lazily-evaluated, module-shaped box: { value: T }.
// The first read of `.value` runs the factory (usually `() => require('x')`),
// caches its result, and then replaces the property with a concrete data
// property for maximal subsequent performance. The property is writable so
// tests can override it (e.g., jest.spyOn, direct assignment).
function __lazyRequire(factory) {
  let loaded = false;
  let cache;

  const box = {};

  Object.defineProperty(box, 'value', {
    configurable: true, // so we can redefine it into a data property
    enumerable: true,
    get() {
      if (!loaded) {
        cache = factory();
        loaded = true;
      }
      // Replace the accessor with a plain data property (fast path).
      Object.defineProperty(box, 'value', {
        configurable: true, // keep configurable so tests can reconfigure if needed
        enumerable: true,
        writable: true, // allow overwriting for tests/mocking
        value: cache,
      });
      return cache;
    },
    set(next) {
      cache = next;
      loaded = true;
      Object.defineProperty(box, 'value', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: next,
      });
    },
  });

  return box;
}

module.exports = { __lazyRequire };
