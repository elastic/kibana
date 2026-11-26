/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { vi } from 'vitest';

// Shared `*-mocks` packages create their mocks with the `jest` global (jest.fn(), etc.).
// Until those packages migrate, expose `vi` under that name so they keep working.
//
// Top-level `jest.mock()` statements in non-test files are renamed to `vi.mock()` at transform
// time (see kbnJestMockPlugin), so Vitest hoists them. Any call that reaches this object wasn't
// rewritten (nested or dynamic) and would silently run after the imports, leaving the real
// module in place: fail loudly instead.
const unsupported = (name) => () => {
  throw new Error(`jest.${name}() is not supported under Vitest; migrate the call to vi.*`);
};

// The file that called `jest.requireActual`: frame 0 is this module, frame 1 the caller.
const getCallerFile = () => {
  const original = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, frames) => frames;
    const file = new Error().stack[2]?.getFileName();
    return file?.startsWith('file:') ? fileURLToPath(file) : file;
  } finally {
    Error.prepareStackTrace = original;
  }
};

globalThis.jest = {
  ...vi,
  mock: unsupported('mock'),
  doMock: unsupported('doMock'),
  unmock: unsupported('unmock'),
  // Shared mocks call this synchronously (often at module level), which `vi.importActual` can't
  // do. Node's require, resolved from the caller, is never intercepted by `vi.mock()`, so it
  // returns the real module like Jest did; Kibana TS sources load through @kbn/swc-register as a
  // separate module instance.
  requireActual: (id) => createRequire(getCallerFile() ?? import.meta.url)(id),
  requireMock: unsupported('requireMock'),
};
