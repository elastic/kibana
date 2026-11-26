/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// jest-environment-jsdom has no setImmediate, so @kbn/jest's setup_test.js installed core-js's
// polyfill, which runs callbacks with process.nextTick under Node. React's scheduler captures
// setImmediate when it loads; with Node's native one, renders scheduled outside act() race
// Testing Library's setTimeout(0) flush and tests flake. Install the same nextTick behavior before
// any setup file loads react-dom; jsdom.js restores the native functions once react-dom has
// loaded, because fake timers created later (vi.useFakeTimers) capture setImmediate to yield in
// runAllTimersAsync and need a real macrotask, like Jest's, which captured setTimeout.

const NATIVE_IMMEDIATE = Symbol.for('kbn.vitest.nativeImmediate');

global[NATIVE_IMMEDIATE] = {
  setImmediate: global.setImmediate,
  clearImmediate: global.clearImmediate,
};

global.setImmediate = (callback, ...args) => {
  const handle = { cancelled: false };
  process.nextTick(() => {
    if (!handle.cancelled) {
      callback(...args);
    }
  });
  return handle;
};

global.clearImmediate = (handle) => {
  if (handle) {
    handle.cancelled = true;
  }
};
