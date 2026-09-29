/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { promises as fs, existsSync } from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { findProductionDependencies, readPnpmLock } from '@kbn/yarn-lock-validator';
import {
  checkProdNativeModules,
  checkDependencies,
  isNativeModule,
} from './check_prod_native_modules';

vi.mock('fs', () => {
  const mocked = {
    promises: {
      readdir: vi.fn(),
    },
    existsSync: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/repo-info', () => {
  const mocked = {
    REPO_ROOT: '/mocked/repo/root',
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/tooling-log', () => {
  const mocked = {
    ToolingLog: vi.fn().mockImplementation(() => ({
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/yarn-lock-validator', () => {
  const mocked = {
    findProductionDependencies: vi.fn(),
    readPnpmLock: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockPackageJsons = vi.hoisted<Record<string, { name: string; version: string }>>(() => ({
  '/test/node_modules/@elastic/test-package/package.json': {
    name: '@elastic/test-package',
    version: '1.0.0',
  },
  '/test/node_modules/@elastic/package/package.json': {
    name: '@elastic/package',
    version: '1.0.0',
  },
}));

// loadPackageJson uses Node's require, which vi.mock can't intercept, so mock the helper itself
vi.mock('./helpers', () => ({
  loadPackageJson: vi.fn((packageJsonPath: string) => mockPackageJsons[packageJsonPath]),
}));

describe('Check Prod Native Modules', () => {
  let mockLog: Mocked<ToolingLog>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLog = new ToolingLog() as Mocked<ToolingLog>;
  });

  describe('isNativeModule', () => {
    it('should return true if binding.gyp is found', async () => {
      (fs.readdir as Mock).mockResolvedValueOnce([
        { name: 'binding.gyp', isDirectory: () => false },
      ]);

      const result = await isNativeModule('/test/path', mockLog);
      expect(result).toBe(true);
    });

    it('should return true if .node file is found', async () => {
      (fs.readdir as Mock).mockResolvedValueOnce([{ name: 'test.node', isDirectory: () => false }]);

      const result = await isNativeModule('/test/path', mockLog);
      expect(result).toBe(true);
    });

    it('should return false if no native module indicators are found', async () => {
      (fs.readdir as Mock).mockResolvedValueOnce([
        { name: 'regular.js', isDirectory: () => false },
      ]);

      const result = await isNativeModule('/test/path', mockLog);
      expect(result).toBe(false);
    });

    it('should log an error if there is an issue reading the directory', async () => {
      (fs.readdir as Mock).mockRejectedValueOnce(new Error('Read error'));

      await isNativeModule('/test/path', mockLog);
      expect(mockLog.error).toHaveBeenCalledWith('Error when reading /test/path: Read error');
    });
  });

  describe('checkDependencies', () => {
    it('should identify native modules in production dependencies', async () => {
      const mockProductionDependencies = new Map([['@elastic/test-package@1.0.0', true]]);
      const mockProdNativeModulesFound: Array<{ name: string; version: string; path: string }> = [];

      (fs.readdir as Mock)
        .mockResolvedValueOnce([{ name: '@elastic', isDirectory: () => true }])
        .mockResolvedValueOnce([{ name: 'test-package', isDirectory: () => true }]);
      (fs.readdir as Mock)
        .mockResolvedValueOnce([{ name: 'binding.gyp', isDirectory: () => false }])
        .mockResolvedValueOnce([]);
      (existsSync as Mock).mockReturnValue(true);
      vi
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(await import('./check_prod_native_modules'), 'isNativeModule')
        .mockResolvedValueOnce(true);

      await checkDependencies(
        '/test/node_modules',
        mockProductionDependencies,
        mockProdNativeModulesFound,
        mockLog
      );

      expect(mockProdNativeModulesFound).toEqual([
        {
          name: '@elastic/test-package',
          version: '1.0.0',
          path: '/test/node_modules/@elastic/test-package',
        },
      ]);
    });

    it('should handle scoped packages', async () => {
      const mockProductionDependencies = new Map([['@elastic/package@1.0.0', true]]);
      const mockProdNativeModulesFound: Array<{ name: string; version: string; path: string }> = [];

      (fs.readdir as Mock)
        .mockResolvedValueOnce([{ name: '@elastic', isDirectory: () => true }])
        .mockResolvedValueOnce([{ name: 'package', isDirectory: () => true }]);
      (fs.readdir as Mock)
        .mockResolvedValueOnce([{ name: 'binding.gyp', isDirectory: () => false }])
        .mockResolvedValueOnce([]);
      (existsSync as Mock).mockReturnValue(true);
      (existsSync as Mock).mockReturnValue(true);
      vi
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(await import('./check_prod_native_modules'), 'isNativeModule')
        .mockResolvedValueOnce(true);

      await checkDependencies(
        '/test/node_modules',
        mockProductionDependencies,
        mockProdNativeModulesFound,
        mockLog
      );

      expect(mockProdNativeModulesFound).toEqual([
        { name: '@elastic/package', version: '1.0.0', path: '/test/node_modules/@elastic/package' },
      ]);
    });
  });

  describe('checkProdNativeModules', () => {
    it('should return false when no native modules are found', async () => {
      (existsSync as Mock).mockReturnValue(true);
      (findProductionDependencies as Mock).mockReturnValue(new Map());
      (readPnpmLock as Mock).mockResolvedValueOnce({});
      (fs.readdir as Mock).mockResolvedValue([]);
      vi
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(await import('./check_prod_native_modules'), 'checkDependencies')
        .mockResolvedValue(undefined);

      const result = await checkProdNativeModules(mockLog);

      expect(result).toBe(false);
      expect(mockLog.success).toHaveBeenCalledWith(
        'No production native modules installed were found'
      );
    });

    it('should return true and log errors when native modules are found', async () => {
      (existsSync as Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);
      (findProductionDependencies as Mock).mockReturnValue(
        new Map([
          ['@elastic/native-module@1.0.0', { name: '@elastic/native-module', version: '1.0.0' }],
        ])
      );
      (readPnpmLock as Mock).mockResolvedValueOnce({});

      // Mock loadPackageJson to return a mock package JSON object
      vi
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(await import('./helpers'), 'loadPackageJson')
        .mockImplementation((packageJsonPath: any) => {
          return {
            name: '@elastic/native-module',
            version: '1.0.0',
          };
        });

      (fs.readdir as Mock)
        .mockResolvedValueOnce([{ name: '@elastic', isDirectory: () => true }])
        .mockResolvedValueOnce([{ name: 'native-module', isDirectory: () => true }])
        // .mockResolvedValueOnce([{ name: 'package.json', isDirectory: () => false }])
        .mockResolvedValueOnce([{ name: 'binding.gyp', isDirectory: () => false }]);
      vi
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(await import('./check_prod_native_modules'), 'checkDependencies')
        .mockImplementationOnce((_, __, prodNativeModulesFound: any) => {
          prodNativeModulesFound.push({
            name: '@elastic/native-module',
            version: '1.0.0',
            path: '/mocked/repo/root/node_modules/@elastic/native-module',
          });
        });

      const result = await checkProdNativeModules(mockLog);

      expect(result).toBe(true);
      expect(mockLog.error).toHaveBeenNthCalledWith(
        1,
        'Production native module detected: node_modules/@elastic/native-module'
      );
      expect(mockLog.error).toHaveBeenNthCalledWith(
        2,
        'Production native modules were detected and logged above'
      );
    });

    it('should throw an error if root node_modules folder is not found', async () => {
      (existsSync as Mock).mockReturnValue(false);
      (findProductionDependencies as Mock).mockReturnValue(new Map());
      (readPnpmLock as Mock).mockResolvedValueOnce({});

      const result = await checkProdNativeModules(mockLog);

      expect(result).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'No root node_modules folder was found in the project. Impossible to continue'
      );
    });
  });
});
