/*
 * This file is included in `setupFiles` in jest.config.js
 * It will be run once per test file
 */

/* eslint-disable @typescript-eslint/no-empty-function */

jest.mock('../../services/fs-promisified', () => {
  return {
    writeFile: jest.fn(async () => 'fs.writeFile mock value'),

    readFile: jest.fn(async (filepath: string) => {
      // mock project config
      if (filepath === '/path/to/project/config') {
        return JSON.stringify({
          upstream: 'backport-org/backport-demo',
          targetBranchChoices: ['6.0', '5.9'],
        });
      }

      // mock global config
      if (filepath.endsWith('/.backport/config.json')) {
        return JSON.stringify({
          username: 'sqren',
          accessToken: 'myAccessToken',
        });
      }

      throw new Error(`Unknown filepath: "${filepath}"`);
    }),

    stat: jest.fn(async () => {
      return {
        isDirectory: () => {},
      };
    }),

    chmod: jest.fn(async () => 'fs.chmod mock value'),
  };
});

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
