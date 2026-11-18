/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

// Shared `*-mocks` packages create their mocks with the `jest` global (jest.fn(), etc.).
// Until those packages migrate, expose `vi` under that name so they keep working.
// Module mocking is not covered: Vitest only hoists calls written as `vi.mock`, so a `jest.mock`
// would silently run after the imports and leave the real module in place. Fail loudly instead.
const unsupported = (name) => () => {
  throw new Error(`jest.${name}() is not supported under Vitest; migrate the call to vi.*`);
};

globalThis.jest = {
  ...vi,
  mock: unsupported('mock'),
  doMock: unsupported('doMock'),
  unmock: unsupported('unmock'),
  requireActual: unsupported('requireActual'),
  requireMock: unsupported('requireMock'),
};
