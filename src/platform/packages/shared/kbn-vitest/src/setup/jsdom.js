/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest counterpart of the setup files in @kbn/jest's jsdom preset. Polyfills shared with Jest
// load from @kbn/jest; the rest covers where Vitest's jsdom environment differs from
// jest-environment-jsdom: Vitest copies jsdom's globals onto Node's global object instead of
// running the test inside the jsdom window, so Node's own fetch, URL, AbortController,
// TextEncoder and typed arrays win unless they're replaced here.

import { afterAll, beforeEach, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import { promisify, TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';
import { ReadableStream } from 'stream/web';
import '@kbn/jest/src/setup/polyfills.jsdom';
// setup_test.js (setImmediate: set_immediate.jsdom.js)
import 'web-streams-polyfill/polyfill';

global.ReadableStream = ReadableStream;

const jsdomWindow = global.jsdom.window;

// Jest's sandbox had no fetch, so polyfills.jsdom.js installed whatwg-fetch; here Node's fetch
// already exists and the polyfill is a no-op.
const whatwgFetch = await import('whatwg-fetch');
for (const name of ['fetch', 'Request', 'Response', 'Headers']) {
  global[name] = whatwgFetch[name];
}

// One realm, like Jest: native libraries check `instanceof Uint8Array` against Node's class.
global.TextEncoder = NodeTextEncoder;
global.TextDecoder = NodeTextDecoder;
global.Uint8Array = Object.getPrototypeOf(Buffer.prototype).constructor;
global.ArrayBuffer = new global.Uint8Array(0).buffer.constructor;

// Node's AbortSignal carries undefined-valued own symbols that break `toEqual`; jsdom has no
// BroadcastChannel, so helpers that stub a missing one must not see Node's.
global.AbortController = jsdomWindow.AbortController;
global.AbortSignal = jsdomWindow.AbortSignal;
delete global.BroadcastChannel;
// setup_test.js: jsdom 20's AbortSignal lacks throwIfAborted.
AbortSignal.prototype.throwIfAborted ??= function throwIfAborted() {
  if (this.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
};

// `window === globalThis` isn't jsdom's Window here, so `new MouseEvent(type, { view: window })`
// is rejected; hand jsdom its own window.
for (const name of [
  'UIEvent',
  'MouseEvent',
  'PointerEvent',
  'WheelEvent',
  'KeyboardEvent',
  'FocusEvent',
  'InputEvent',
  'TouchEvent',
  'CompositionEvent',
]) {
  const Base = global[name];
  if (typeof Base === 'function') {
    const EventWithJsdomView = class extends Base {
      constructor(type, init) {
        super(type, init?.view === global ? { ...init, view: jsdomWindow } : init);
      }
    };
    Object.defineProperty(EventWithJsdomView, 'name', { value: name });
    global[name] = EventWithJsdomView;
  }
}

// jest-environment-jsdom exposed jsdom's (whatwg-url) URL, whose errors and behavior differ from
// Node's; core-js filled in what it lacks there.
const { URL: JsdomURL, URLSearchParams: JsdomURLSearchParams } = jsdomWindow;
JsdomURL.canParse ??= (url, base) => JsdomURL.parse(url, base) !== null;
JsdomURL.parse ??= (url, base) => {
  try {
    return new JsdomURL(url, base);
  } catch {
    return null;
  }
};
if (!Object.hasOwn(JsdomURL, 'createObjectURL')) {
  Object.defineProperty(JsdomURL, 'createObjectURL', { value: () => '' });
}
if (!('size' in JsdomURLSearchParams.prototype)) {
  Object.defineProperty(JsdomURLSearchParams.prototype, 'size', {
    configurable: true,
    get() {
      let size = 0;
      this.forEach(() => size++);
      return size;
    },
  });
}
global.URL = JsdomURL;
global.URLSearchParams = JsdomURLSearchParams;

// polyfills.jsdom.js only stubs matchMedia when `Worker` is missing, which Node provides.
if (typeof window.matchMedia !== 'function') {
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

// Closing jest-environment-jsdom's window cancelled pending timers. Vitest keeps Node's timers,
// so e.g. EUI's LiveAnnouncer timeouts fire after the environment is gone. Track and clear them.
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

// react_testing_library.js and emotion.js
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

// setup_test.js: reinstall jest-canvas-mock after suites reset their mocks.
const { setupJestCanvasMock } = await import('jest-canvas-mock');
beforeEach(() => {
  setupJestCanvasMock();
});

// mocks.eui.js: run EUI's batched state changes synchronously.
vi.mock('@elastic/eui/lib/services/react', () => ({
  enqueueStateChange: (fn) => fn(),
}));

// mocks.kbn_i18n_react.js: setup files share the test's module graph in Vitest, so initializing
// i18n once here reaches the instance @kbn/i18n-react uses.
const { i18n } = await import('@kbn/i18n');
i18n.init({ locale: 'en', messages: {} });

// react-dom (imported above through @testing-library/react) has captured the nextTick-based
// setImmediate from set_immediate.jsdom.js; give everything else Node's again.
const native = global[Symbol.for('kbn.vitest.nativeImmediate')];
global.setImmediate = native.setImmediate;
global.clearImmediate = native.clearImmediate;
