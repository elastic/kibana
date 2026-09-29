/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest counterpart of the Jest setupFilesAfterEnv list in jest-preset.js.

import { afterAll, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import 'web-streams-polyfill/polyfill';
import { ReadableStream } from 'stream/web';
import setImmediate from 'core-js/stable/set-immediate';
import clearImmediate from 'core-js/stable/clear-immediate';
import { configure } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import { createRequire } from 'module';
import { promisify, TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';
import { i18n } from '@kbn/i18n';

// Shared Kibana mock factories (coreMock, elasticsearchServiceMock, ...) are also used by the Jest
// integration tests, so they keep calling `jest.*`; the global routes those calls to `vi`.
//
// `jest.requireActual()` must stay synchronous, so it maps to Node's require, resolved from the
// calling file. vi.mock() never intercepts Node's require, so the module comes back unmocked as in
// Jest; Kibana TS sources load through @kbn/swc-register as a separate module instance.
const nodeRequire = createRequire(import.meta.url);
// Kibana sources still `require()` TypeScript modules lazily (e.g. @kbn/workflows specs, plugin
// config loaders). Vitest leaves require() to Node, so compile TS through @kbn/swc-register like
// `node scripts/*` do. Those modules are separate instances that vi.mock() does not intercept.
// swc-register also installs source-map-support, which replaces Error.prepareStackTrace; keep
// Vitest's own mapping, which inline snapshots and error locations rely on.
const vitestPrepareStackTrace = Error.prepareStackTrace;
nodeRequire('@kbn/swc-register').install();
Error.prepareStackTrace = vitestPrepareStackTrace;

// Jest's jsdom sandbox had no fetch, so polyfills.jsdom.js installed whatwg-fetch (XHR based,
// relative URLs, jsdom Blob bodies). Vitest's jsdom global inherits Node's undici fetch, which made
// that polyfill a no-op; install it explicitly.
if (typeof window !== 'undefined') {
  const whatwgFetch = nodeRequire('whatwg-fetch');
  for (const name of ['fetch', 'Request', 'Response', 'Headers']) {
    global[name] = whatwgFetch[name];
  }
}

const getCallerFile = () => {
  const [, , callerFrame = ''] = new Error().stack.split('\n').slice(1);
  const [, file] = /\(?(?:file:\/\/)?(\/[^():]+):\d+:\d+\)?$/.exec(callerFrame.trim()) ?? [];
  return file ?? import.meta.url;
};

const requireActual = (id) => createRequire(getCallerFile())(id);
global.jest = new Proxy(vi, {
  get: (target, key) => (key === 'requireActual' ? requireActual : Reflect.get(target, key)),
});

global.ReadableStream = ReadableStream;
global.setImmediate = setImmediate;
global.clearImmediate = clearImmediate;

// polyfills.jsdom.js only defines matchMedia when `Worker` is missing, which holds in Jest's
// sandbox but not in Vitest's jsdom environment.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

// Vitest's jsdom environment installs jsdom's realm globals (TextEncoder, Uint8Array, ...) next to
// Node's Buffer/TextEncoder output, so `instanceof Uint8Array` checks in native libraries such as
// openpgp fail. Jest ran everything in one realm; use Node's classes consistently.
if (typeof window !== 'undefined') {
  const NodeUint8Array = Object.getPrototypeOf(Buffer.prototype).constructor;
  global.TextEncoder = NodeTextEncoder;
  global.TextDecoder = NodeTextDecoder;
  global.Uint8Array = NodeUint8Array;
  global.ArrayBuffer = new NodeUint8Array(0).buffer.constructor;
}

// Same as src/jest/setup/setup_test.js: jsdom 20's AbortSignal lacks throwIfAborted.
if (
  typeof AbortSignal !== 'undefined' &&
  typeof AbortSignal.prototype.throwIfAborted !== 'function'
) {
  AbortSignal.prototype.throwIfAborted = function throwIfAborted() {
    if (this.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  };
}

// Jest's jsdom environment ran timers on the jsdom window, and closing it cancelled whatever was
// still pending. Vitest keeps Node's timers, so e.g. EUI's LiveAnnouncer timeouts fire after the
// environment is gone ("window is not defined"). Track timers and clear the leftovers per file.
if (typeof window !== 'undefined') {
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
}

configure({ testIdAttribute: 'data-test-subj', asyncUtilTimeout: 4500 });
expect.extend(matchers);

const consoleFilters = [
  /^The above error occurred in the <.*?> component:/,
  /^Error: Uncaught .+/,
  /The pseudo class .* is potentially unsafe when doing server-side rendering/,
  /There was a problem inserting the following rule[\s\S]*@container/,
];
const originalConsoleError = console.error;
console.error = (...args) => {
  const [first] = args;
  const message = typeof first === 'object' && first?.message ? first.message : first?.toString();
  if (message?.startsWith('Could not parse CSS stylesheet')) {
    return;
  }
  if (message && consoleFilters.some((filter) => filter.test(message))) {
    return;
  }
  originalConsoleError(...args);
};

if (process.env.CI) {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

vi.mock('moment-timezone', async (importOriginal) => {
  const actual = await importOriginal();
  const moment = actual.default ?? actual;
  moment.tz.guess = () => 'America/New_York';
  moment.tz.setDefault('America/New_York');
  return actual;
});

vi.mock('@elastic/eui/lib/services/react', () => ({
  enqueueStateChange: (fn) => fn(),
}));

// Jest initializes i18n from a @kbn/i18n-react mock; setup files share the test's module graph
// in Vitest, so initializing it here reaches the same instance.
i18n.init({ locale: 'en', messages: {} });
