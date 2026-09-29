/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Loaded first among the jsdom setup files so libraries that capture setTimeout at load time
// (react-dom's scheduler via the enzyme adapter) get the tracked version.
// Jest's jsdom environment ran timers on the jsdom window, and closing it cancelled whatever was
// still pending. Vitest keeps Node's timers, so e.g. EUI's LiveAnnouncer timeouts fire after the
// environment is gone ("window is not defined"). Track timers and clear the leftovers per file.

import { afterAll } from 'vitest';
import { promisify } from 'util';

const pendingTimers = new Map();
const wrapTimer = (schedule, clear, isInterval) => {
  const wrapped = Object.assign((callback, ...rest) => {
    const handle = schedule(
      typeof callback === 'function' && !isInterval
        ? (...args) => {
            pendingTimers.delete(handle);
            return callback(...args);
          }
        : callback,
      ...rest
    );
    pendingTimers.set(handle, clear);
    return handle;
  }, schedule);
  // keep util.promisify(setTimeout) working
  wrapped[promisify.custom] = schedule[promisify.custom];
  return wrapped;
};
const wrapClear = (clear) =>
  Object.assign((handle) => {
    pendingTimers.delete(handle);
    return clear(handle);
  }, clear);

global.setTimeout = wrapTimer(global.setTimeout, global.clearTimeout, false);
global.setInterval = wrapTimer(global.setInterval, global.clearInterval, true);
global.clearTimeout = wrapClear(global.clearTimeout);
global.clearInterval = wrapClear(global.clearInterval);

afterAll(() => {
  pendingTimers.forEach((clear, handle) => clear(handle));
  pendingTimers.clear();
});
