/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi, beforeEach, afterEach } from 'vitest';

/**
 * Global test setup for Vitest.
 * This mirrors the setup used in Jest's setupFilesAfterEnv.
 */

// Expose Jest-compatible globals for backwards compatibility
// This allows tests written for Jest to work with Vitest without modification
// We extend vi with additional Jest-specific methods
// @ts-expect-error - intentionally adding jest global for compatibility
globalThis.jest = {
  ...vi,
  // jest.requireMock returns the mocked module (same as importing a mocked module)
  requireMock: (modulePath: string) => {
    // Since vi.mock is hoisted, importing the module returns the mocked version
    // We use require here which will return the mocked module
    return require(modulePath);
  },
  // jest.requireActual returns the actual module, bypassing mocks
  // Note: This is also transformed by jestCompatPlugin to vi.importActual in mock factories
  requireActual: (modulePath: string) => {
    return require(modulePath);
  },
};

// Clear all mocks between tests for isolation
beforeEach(() => {
  vi.clearAllMocks();
});

// Restore all mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Mock moment-timezone to use UTC by default
vi.mock('moment-timezone', async (importOriginal) => {
  const moment = await importOriginal<typeof import('moment-timezone')>();
  // Set default timezone to UTC for consistent test results
  moment.tz.setDefault('UTC');
  return moment;
});

// Mock EUI icon loading to prevent network requests
vi.mock('@elastic/eui/lib/components/icon/icon', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    // Mock icon loading to return empty
    appendIconComponentCache: vi.fn(),
    getIconComponentCache: vi.fn(() => ({})),
  };
});

// Mock Vega to prevent complex initialization
vi.mock('vega', () => ({
  default: {},
  View: vi.fn(),
  parse: vi.fn(),
  loader: vi.fn(() => ({
    load: vi.fn(),
    sanitize: vi.fn(),
  })),
}));

vi.mock('vega-lite', () => ({
  default: {},
  compile: vi.fn(() => ({ spec: {} })),
}));

// Suppress console output in CI to reduce noise
if (process.env.CI) {
  const originalConsole = { ...console };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    // Keep warn and error for visibility
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.log = originalConsole.log;
    // eslint-disable-next-line no-console
    console.info = originalConsole.info;
    // eslint-disable-next-line no-console
    console.debug = originalConsole.debug;
  });
}

export {};
