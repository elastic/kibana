/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest counterpart of the Jest setupFilesAfterEnv list in jest-preset.js.

import { expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import 'web-streams-polyfill/polyfill';
import { ReadableStream } from 'stream/web';
import setImmediate from 'core-js/stable/set-immediate';
import clearImmediate from 'core-js/stable/clear-immediate';
import { configure } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import { createRequire, registerHooks } from 'module';
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';
import { i18n } from '@kbn/i18n';

// jest-runner raises the limit to 100 for every test file; stack-based checks such as
// disallow_code_generation.js look for frames beyond the default 10.
Error.stackTraceLimit = 100;

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
// lmdb (swc-register's transform cache) locates its native addon from `document.baseURI` when a
// `document` exists, which under jsdom is http://localhost/; hide it while the cache loads.
const jsdomDocument = global.document;
global.document = undefined;
try {
  nodeRequire('@kbn/swc-register').install();
} finally {
  global.document = jsdomDocument;
}
Error.prepareStackTrace = vitestPrepareStackTrace;

// Natively loaded code (node_modules and `jest.requireActual`) goes through Node's loader, which
// Jest bypassed with its own resolver and transforms:
// - Jest's resolver stubbed style imports for every module (e.g. monaco-editor's `import './x.css'`);
// - Jest transformed ESM packages whose relative imports omit the extension (e.g. monaco-promql,
//   in transformIgnorePatterns), which Node's ESM resolution rejects.
const NATIVE_HOOKS = Symbol.for('kbn.vitest.nativeHooks');
const isNotFound = (error) => error?.code === 'ERR_MODULE_NOT_FOUND';
if (!global[NATIVE_HOOKS]) {
  global[NATIVE_HOOKS] = registerHooks({
    resolve: (specifier, context, nextResolve) => {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        const retry =
          isNotFound(error) &&
          /^\.\.?\//.test(specifier) &&
          !/\.[cm]?js$/.test(specifier) &&
          context.parentURL?.includes('/node_modules/');
        if (!retry) {
          throw error;
        }
        return nextResolve(`${specifier}.js`, context);
      }
    },
    load: (url, context, nextLoad) =>
      /\.(css|less|scss)$/.test(url)
        ? { format: 'module', source: 'export default {};', shortCircuit: true }
        : nextLoad(url, context),
  });
}

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
const jestProxy = new Proxy(vi, {
  get: (target, key) => (key === 'requireActual' ? requireActual : Reflect.get(target, key)),
});
// Storybook previews loaded by story tests assign `window.jest = require('jest-mock')`. Jest's
// `jest` was module-scoped so that never mattered; here it would replace the global that
// libraries like @testing-library read to drive fake timers, so writes are ignored.
Object.defineProperty(global, 'jest', {
  configurable: true,
  get: () => jestProxy,
  set: () => {},
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

// jest-environment-jsdom exposed jsdom's AbortController/AbortSignal; Vitest keeps Node's, whose
// signals carry undefined-valued own symbols (kEvents, kReason, ...) that make `toEqual` on
// objects holding a signal fail.
if (typeof window !== 'undefined' && global.jsdom?.window) {
  global.AbortController = global.jsdom.window.AbortController;
  global.AbortSignal = global.jsdom.window.AbortSignal;
  // jsdom has no BroadcastChannel; Node's leaked into Vitest's jsdom global, so helpers such as
  // stubBroadcastChannel() (which only stubs a missing one) never installed their stub.
  delete global.BroadcastChannel;
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

// Vitest exposes jsdom's globals on Node's global object, so `window === globalThis` isn't jsdom's
// Window and `new MouseEvent(type, { view: window })` is rejected. Pass the real jsdom window.
if (typeof window !== 'undefined' && global.jsdom?.window) {
  const jsdomWindow = global.jsdom.window;
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
    if (typeof Base !== 'function') {
      continue;
    }
    const EventWithJsdomView = class extends Base {
      constructor(type, init) {
        super(type, init?.view === global ? { ...init, view: jsdomWindow } : init);
      }
    };
    Object.defineProperty(EventWithJsdomView, 'name', { value: name });
    global[name] = EventWithJsdomView;
  }
}

// jest-environment-jsdom exposed jsdom's (whatwg-url) URL; Vitest leaves Node's, whose error
// messages and behavior differ ("Invalid URL" vs "Invalid URL: <input>").
if (typeof window !== 'undefined' && global.jsdom?.window) {
  const { URL: JsdomURL, URLSearchParams: JsdomURLSearchParams } = global.jsdom.window;
  // core-js (polyfills.jsdom.js) filled in what whatwg-url lacks (URL.parse/canParse,
  // URLSearchParams#size) in Jest; here it already ran against Node's URL, which has them.
  JsdomURL.canParse ??= (url, base) => {
    try {
      return Boolean(new JsdomURL(url, base));
    } catch {
      return false;
    }
  };
  JsdomURL.parse ??= (url, base) => {
    try {
      return new JsdomURL(url, base);
    } catch {
      return null;
    }
  };
  // polyfills.jsdom.js stubs createObjectURL only when missing, which Node's URL is not
  if (!Object.hasOwn(JsdomURL, 'createObjectURL')) {
    Object.defineProperty(JsdomURL, 'createObjectURL', { value: () => '' });
  }
  global.URL = JsdomURL;
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
  global.URLSearchParams = JsdomURLSearchParams;
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
