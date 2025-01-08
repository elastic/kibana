/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promises as fs, existsSync } from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { findProductionDependencies, readYarnLock } from '@kbn/yarn-lock-validator';
import {
  checkProdNativeModules,
  checkDependencies,
  isNativeModule,
} from './check_prod_native_modules';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
  },
  existsSync: jest.fn(),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mocked/repo/root',
}));

jest.mock('@kbn/tooling-log', () => ({
  ToolingLog: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  })),
}));

jest.mock('@kbn/yarn-lock-validator', () => ({
  findProductionDependencies: jest.fn(),
  readYarnLock: jest.fn(),
}));

jest.mock(
  // eslint-disable-next-line @kbn/imports/no_unresolvable_imports
  '/test/node_modules/test-package/package.json',
  () => ({
    name: 'test-package',
    version: '1.0.0',
  }),
  { virtual: true }
);

jest.mock(
  // eslint-disable-next-line @kbn/imports/no_unresolvable_imports
  '/test/node_modules/@scope/package/package.json',
  () => ({
    name: '@scope/package',
    version: '1.0.0',
  }),
  { virtual: true }
);

describe('Check Prod Native Modules', () => {
  let mockLog: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = new ToolingLog() as jest.Mocked<ToolingLog>;
  });

  describe('isNativeModule', () => {
    it('should return true if binding.gyp is found', async () => {
      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        { name: 'binding.gyp', isDirectory: () => false },
      ]);

      const result = await isNativeModule('/test/path', mockLog);
      expect(result).toBe(true);
    });

    it('should return true if .node file is found', async () => {
      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        { name: 'test.node', isDirectory: () => false },
      ]);

      const result = await isNativeModule('/test/path', mockLog);
      expect(result).toBe(true);
    });

    it('should return false if no native module indicators are found', async () => {
      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        { name: 'regular.js', isDirectory: () => false },
      ]);

      const result = await isNativeModule('/test/path', mockLog);
      expect(result).toBe(false);
    });

    it('should log an error if there is an issue reading the directory', async () => {
      (fs.readdir as jest.Mock).mockRejectedValueOnce(new Error('Read error'));

      await isNativeModule('/test/path', mockLog);
      expect(mockLog.error).toHaveBeenCalledWith('Error when reading /test/path: Read error');
    });
  });

  describe('checkDependencies', () => {
    it('should identify native modules in production dependencies', async () => {
      const mockProductionDependencies = new Map([['test-package@1.0.0', true]]);
      const mockProdNativeModulesFound: Array<{ name: string; version: string; path: string }> = [];

      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        { name: 'test-package', isDirectory: () => true },
      ]);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([{ name: 'binding.gyp', isDirectory: () => false }])
        .mockResolvedValueOnce([]);
      (existsSync as jest.Mock).mockReturnValue(true);
      jest
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(require('./check_prod_native_modules'), 'isNativeModule')
        .mockResolvedValueOnce(true);

      await checkDependencies(
        '/test/node_modules',
        mockProductionDependencies,
        mockProdNativeModulesFound,
        mockLog
      );

      expect(mockProdNativeModulesFound).toEqual([
        { name: 'test-package', version: '1.0.0', path: '/test/node_modules/test-package' },
      ]);
    });

    it('should handle scoped packages', async () => {
      const mockProductionDependencies = new Map([['@scope/package@1.0.0', true]]);
      const mockProdNativeModulesFound: Array<{ name: string; version: string; path: string }> = [];

      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([{ name: '@scope', isDirectory: () => true }])
        .mockResolvedValueOnce([{ name: 'package', isDirectory: () => true }]);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([{ name: 'binding.gyp', isDirectory: () => false }])
        .mockResolvedValueOnce([]);
      (existsSync as jest.Mock).mockReturnValue(true);
      (existsSync as jest.Mock).mockReturnValue(true);
      jest
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(require('./check_prod_native_modules'), 'isNativeModule')
        .mockResolvedValueOnce(true);

      await checkDependencies(
        '/test/node_modules',
        mockProductionDependencies,
        mockProdNativeModulesFound,
        mockLog
      );

      expect(mockProdNativeModulesFound).toEqual([
        { name: '@scope/package', version: '1.0.0', path: '/test/node_modules/@scope/package' },
      ]);
    });
  });

  describe('checkProdNativeModules', () => {
    it('should return false when no native modules are found', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (findProductionDependencies as jest.Mock).mockReturnValue(new Map());
      (readYarnLock as jest.Mock).mockResolvedValueOnce({});
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      jest
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(require('./check_prod_native_modules'), 'checkDependencies')
        .mockResolvedValue(undefined);

      const result = await checkProdNativeModules(mockLog);

      expect(result).toBe(false);
      expect(mockLog.success).toHaveBeenCalledWith(
        'No production native modules installed were found'
      );
    });

    it('should return true and log errors when native modules are found', async () => {
      (existsSync as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);
      (findProductionDependencies as jest.Mock).mockReturnValue(
        new Map([['native-module@1.0.0', { name: 'native-module', version: '1.0.0' }]])
      );
      (readYarnLock as jest.Mock).mockResolvedValueOnce({});

      // Mock loadPackageJson to return a mock package JSON object
      jest
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(require('./helpers'), 'loadPackageJson')
        .mockImplementation((packageJsonPath: any) => {
          return {
            name: 'native-module',
            version: '1.0.0',
          };
        });

      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([{ name: 'native-module', isDirectory: () => true }])
        // .mockResolvedValueOnce([{ name: 'package.json', isDirectory: () => false }])
        .mockResolvedValueOnce([{ name: 'binding.gyp', isDirectory: () => false }]);
      jest
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .spyOn(require('./check_prod_native_modules'), 'checkDependencies')
        .mockImplementationOnce((_, __, prodNativeModulesFound: any) => {
          prodNativeModulesFound.push({
            name: 'native-module',
            version: '1.0.0',
            path: '/path/to/native-module',
          });
        });

      const result = await checkProdNativeModules(mockLog);

      expect(result).toBe(true);
      expect(mockLog.error).toHaveBeenNthCalledWith(
        1,
        'Production native module detected: node_modules/native-module'
      );
      expect(mockLog.error).toHaveBeenNthCalledWith(
        2,
        'Production native modules were detected and logged above'
      );
    });

    it('should throw an error if root node_modules folder is not found', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (findProductionDependencies as jest.Mock).mockReturnValue(new Map());
      (readYarnLock as jest.Mock).mockResolvedValueOnce({});

      const result = await checkProdNativeModules(mockLog);

      expect(result).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'No root node_modules folder was found in the project. Impossible to continue'
      );
    });
  });
});
