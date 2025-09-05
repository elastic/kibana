/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateAndProcessTestFiles } from './test_files';

// Mock the kbn-repo-info module to return a predictable REPO_ROOT
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
}));

import * as fs from 'fs';
const mockFs = fs as jest.Mocked<typeof fs>;

describe('validateAndProcessTestFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for successful validation
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
  });

  describe('UI tests directory', () => {
    it('should derive correct config for ui/tests directory', () => {
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/test.spec.ts';

      const result = validateAndProcessTestFiles(testFile);

      expect(result).toEqual({
        testFiles: [testFile],
        configPath:
          'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/playwright.config.ts',
      });
    });

    it('should derive correct config for ui/parallel_tests directory', () => {
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/parallel_tests/test.spec.ts';

      const result = validateAndProcessTestFiles(testFile);

      expect(result).toEqual({
        testFiles: [testFile],
        configPath:
          'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/parallel.playwright.config.ts',
      });
    });
  });

  describe('API tests directory', () => {
    it('should derive correct config for scout/api/tests directory', () => {
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/api/tests/test.spec.ts';

      const result = validateAndProcessTestFiles(testFile);

      expect(result).toEqual({
        testFiles: [testFile],
        configPath:
          'x-pack/solutions/observability/plugins/my_plugin/test/scout/api/playwright.config.ts',
      });
    });
  });

  describe('Multiple files validation', () => {
    it('should handle multiple files from same directory', () => {
      const testFiles = [
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/test1.spec.ts',
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/test2.spec.ts',
      ];
      const testFilesString = testFiles.join(',');

      const result = validateAndProcessTestFiles(testFilesString);

      expect(result).toEqual({
        testFiles,
        configPath:
          'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/playwright.config.ts',
      });
    });

    it('should throw error for files from different directories', () => {
      const testFilesString =
        'path/scout/ui/tests/test1.spec.ts,path/scout/api/tests/test2.spec.ts';

      expect(() => validateAndProcessTestFiles(testFilesString)).toThrow(
        `All test files must be from the same scout test directory`
      );
    });
  });

  describe('Error cases', () => {
    it('should throw error for invalid scout path', () => {
      const testFile = 'some/other/path/test.spec.ts';

      expect(() => validateAndProcessTestFiles(testFile)).toThrow(
        `Test file must be from 'scout/ui/tests', 'scout/ui/parallel_tests', or 'scout/api/tests' directory`
      );
    });

    it('should throw error for non-existent file', () => {
      mockFs.existsSync.mockReturnValue(false);
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/test.spec.ts';

      expect(() => validateAndProcessTestFiles(testFile)).toThrow(
        `Test file does not exist: ${testFile}`
      );
    });

    it('should throw error for directory instead of file', () => {
      mockFs.statSync.mockReturnValue({ isFile: () => false } as any);
      const testFile =
        'x-pack/solutions/observability/plugins/my_plugin/test/scout/ui/tests/directory';

      expect(() => validateAndProcessTestFiles(testFile)).toThrow(
        `Test file must be a file, not a directory: ${testFile}`
      );
    });
  });
});
