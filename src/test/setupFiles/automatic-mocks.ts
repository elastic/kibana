/*
 * This file is included in `setupFiles` in jest.config.js
 * It will be run once per test file
 */

/* eslint-disable @typescript-eslint/no-empty-function */

jest.mock('find-up', () => {
  return jest.fn(async () => '/path/to/project/config');
});

jest.mock('make-dir', () => {
  return jest.fn(() => Promise.resolve('/some/path'));
});

jest.mock('del', () => {
  return jest.fn(async (path) => `Attempted to delete ${path}`);
});

jest.mock('ora', () => {
  const ora = {
    start: () => ({
      succeed: () => {},
      stop: () => {},
      fail: () => {},
      stopAndPersist: () => {},
    }),
  };

  return jest.fn(() => ora);
});

// silence logger
jest.mock('../../services/logger', () => {
  const spy = jest.fn();
  return {
    redactAccessToken: jest.fn((str: string) => str),
    consoleLog: jest.fn(),
    updateLogger: jest.fn(),
    logger: {
      spy: spy,
      info: (msg: string, meta: unknown) => spy(`[INFO] ${msg}`, meta),
      verbose: (msg: string, meta: unknown) => spy(`[VERBOSE] ${msg}`, meta),
      warn: (msg: string, meta: unknown) => spy(`[WARN] ${msg}`, meta),
      debug: (msg: string, meta: unknown) => spy(`[DEBUG] ${msg}`, meta),
    },
  };
});
