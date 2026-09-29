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
import { createRequire } from 'module';
import { i18n } from '@kbn/i18n';

// Shared Kibana mock factories (coreMock, elasticsearchServiceMock, ...) are also used by the Jest
// integration tests, so they keep calling `jest.*`; the global routes those calls to `vi`.
//
// `jest.requireActual()` must stay synchronous, so it maps to Node's require, resolved from the
// calling file. vi.mock() never intercepts Node's require, so the module comes back unmocked as in
// Jest; Kibana TS sources load through @kbn/swc-register as a separate module instance.
const nodeRequire = createRequire(import.meta.url);

const getCallerFile = () => {
  const [, , callerFrame = ''] = new Error().stack.split('\n').slice(1);
  const [, file] = /\(?(?:file:\/\/)?(\/[^():]+):\d+:\d+\)?$/.exec(callerFrame.trim()) ?? [];
  return file ?? import.meta.url;
};

const requireActual = (id) => {
  if (id.startsWith('.') || id.startsWith('@kbn/')) {
    // no-op after the first call
    nodeRequire('@kbn/swc-register').install();
  }
  return createRequire(getCallerFile())(id);
};

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
