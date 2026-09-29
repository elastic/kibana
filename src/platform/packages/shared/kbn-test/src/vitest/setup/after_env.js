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

// Shared Kibana mock factories (coreMock, elasticsearchServiceMock, ...) still call `jest.*`.
// Routing the global to `vi` lets migrated suites consume them while Jest suites still exist.
// `requireActual` maps to Node's require: vi.mock() never intercepts it, so npm packages come
// back unmocked, as with Jest. Kibana TS sources cannot be loaded this way.
const nodeRequire = createRequire(import.meta.url);
global.jest = new Proxy(vi, {
  get: (target, key) => (key === 'requireActual' ? nodeRequire : Reflect.get(target, key)),
});

global.ReadableStream = ReadableStream;
global.setImmediate = setImmediate;
global.clearImmediate = clearImmediate;

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
