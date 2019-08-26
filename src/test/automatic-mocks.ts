import { last } from 'lodash';
import os from 'os';

jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');

jest.mock('../services/child-process-promisified', () => {
  return {
    exec: jest.fn(async () => 'success'),

    execAsCallback: jest.fn((...args) => {
      last(args)();
      return {
        stderr: {
          on: () => {}
        }
      };
    })
  };
});

jest.mock('../services/fs-promisified', () => {
  return {
    writeFile: jest.fn(async () => 'fs.writeFile mock value'),

    readFile: jest.fn(async (filepath: string) => {
      // mock project config
      if (filepath === '/path/to/project/config') {
        return JSON.stringify({
          upstream: 'elastic/backport-demo',
          branches: ['6.0', '5.9']
        });
      }

      // mock global config
      if (filepath.endsWith('/.backport/config.json')) {
        return JSON.stringify({
          username: 'sqren',
          accessToken: 'myAccessToken'
        });
      }

      throw new Error(`Unknown filepath: "${filepath}"`);
    }),

    stat: jest.fn(async () => {
      return {
        isDirectory: () => {}
      };
    }),

    chmod: jest.fn(async () => 'fs.chmod mock value')
  };
});

jest.mock('find-up', () => {
  return jest.fn(async () => '/path/to/project/config');
});

jest.mock('make-dir', () => {
  return jest.fn(() => Promise.resolve('/some/path'));
});

jest.mock('del', () => {
  return jest.fn(async path => `Attempted to delete ${path}`);
});

jest.mock('ora', () => {
  const ora = {
    start: () => ({
      succeed: () => {},
      stop: () => {},
      fail: () => {},
      stopAndPersist: () => {}
    })
  };

  return () => ora;
});

// silence logger
jest.mock('../services/logger');
