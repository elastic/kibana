/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { createNoRestrictedImportsOverride } from './no-restricted-imports';

// Mock dependencies
jest.mock('child_process');
jest.mock('minimatch');

// Mock __dirname for ES modules
const mockDirname = '/mock/current/directory';
global.__dirname = mockDirname;

describe('createNoRestrictedImportsOverride', () => {
  let mockExecSync;
  let mockMinimatch;
  let mockRequire;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock execSync
    mockExecSync = jest.fn().mockReturnValue('/mock/root/directory\n');
    const childProcess = await import('child_process');
    childProcess.execSync = mockExecSync;

    // Mock minimatch
    mockMinimatch = jest.fn().mockReturnValue(true);
    const minimatch = await import('minimatch');
    minimatch.default = mockMinimatch;

    // Mock require for ESLint config
    mockRequire = jest.fn();
    global.require = mockRequire;
  });

  afterEach(() => {
    delete global.require;
  });

  describe('basic functionality', () => {
    it('should throw error when no restricted imports provided', () => {
      expect(() => {
        createNoRestrictedImportsOverride();
      }).toThrow('No restricted imports provided. Please specify at least one import to restrict.');

      expect(() => {
        createNoRestrictedImportsOverride({ restrictedImports: [] });
      }).toThrow('No restricted imports provided. Please specify at least one import to restrict.');
    });

    it('should call git to get root directory', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --show-toplevel', {
        encoding: 'utf8',
        cwd: mockDirname,
      });
    });

    it('should load root ESLint config', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      const expectedPath = path.relative(mockDirname, '/mock/root/directory');
      expect(mockRequire).toHaveBeenCalledWith(`${expectedPath}/.eslintrc`);
    });
  });

  describe('rule processing', () => {
    it('should process overrides with no-restricted-imports rule', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
          {
            files: ['**/*.ts'],
            rules: {
              'no-console': 'error',
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].rules['no-restricted-imports']).toEqual([
        'error',
        {
          paths: ['lodash', 'moment'],
          patterns: [],
        },
      ]);
    });

    it('should handle string-only restricted imports rule', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': 'error',
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      // Should not modify rules that don't have array config
      expect(result[0].rules['no-restricted-imports']).toBe('error');
    });

    it('should handle mixed path formats in existing config', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': [
                'error',
                'lodash',
                { name: 'moment', message: 'Use date-fns instead' },
                { paths: ['jquery'], patterns: ['@angular/*'] },
              ],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['axios'],
      });

      expect(result[0].rules['no-restricted-imports']).toEqual([
        'error',
        {
          paths: ['lodash', { name: 'moment', message: 'Use date-fns instead' }, 'jquery', 'axios'],
          patterns: ['@angular/*'],
        },
      ]);
    });

    it('should remove duplicate restricted imports', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash', 'moment'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment', 'axios'],
      });

      expect(result[0].rules['no-restricted-imports']).toEqual([
        'error',
        {
          paths: ['lodash', 'moment', 'axios'],
          patterns: [],
        },
      ]);
    });

    it('should handle duplicate detection with mixed string/object formats', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash', { name: 'moment' }] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment', { name: 'lodash', message: 'Custom message' }],
      });

      expect(result[0].rules['no-restricted-imports']).toEqual([
        'error',
        {
          paths: ['moment', { name: 'lodash', message: 'Custom message' }],
          patterns: [],
        },
      ]);
    });
  });

  describe('file path resolution', () => {
    it('should convert relative file paths to absolute paths', () => {
      const mockConfig = {
        overrides: [
          {
            files: 'src/**/*.js',
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(mockMinimatch).toHaveBeenCalledWith(mockDirname, expect.any(String), {
        matchBase: true,
        dot: true,
        nocase: true,
      });
    });

    it('should handle array of file patterns', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['src/**/*.js', 'lib/**/*.ts'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].files).toHaveLength(2);
    });

    it('should filter out overrides that do not apply to current directory', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['src/**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
          {
            files: ['other/**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['moment'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      // Mock minimatch to return false for 'other/**/*.js'
      mockMinimatch.mockImplementation((target, pattern) => {
        return !pattern.includes('other');
      });

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['axios'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].files[0]).not.toContain('other');
    });
  });

  describe('getAssignableDifference function', () => {
    beforeEach(() => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);
    });

    it('should handle glob patterns correctly', () => {
      // This is testing the internal getAssignableDifference function
      // We can test it indirectly through the main function
      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].files).toContain('**/*');
    });

    it('should handle non-glob patterns', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['src/index.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty overrides array', () => {
      const mockConfig = {
        overrides: [],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result).toEqual([]);
    });

    it('should handle missing overrides property', () => {
      const mockConfig = {};
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result).toEqual([]);
    });

    it('should handle overrides without rules', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result).toEqual([]);
    });

    it('should handle rule with only severity level', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error'],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      // Should not modify rules with only severity
      expect(result[0].rules['no-restricted-imports']).toEqual(['error']);
    });

    it('should preserve patterns when adding new paths', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': [
                'error',
                {
                  paths: ['lodash'],
                  patterns: ['@deprecated/*', { group: ['old-*'], message: 'Use new versions' }],
                },
              ],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['moment'],
      });

      expect(result[0].rules['no-restricted-imports']).toEqual([
        'error',
        {
          paths: ['lodash', 'moment'],
          patterns: ['@deprecated/*', { group: ['old-*'], message: 'Use new versions' }],
        },
      ]);
    });

    it('should handle complex restricted import objects', () => {
      const mockConfig = {
        overrides: [
          {
            files: ['**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: [] }],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: [
          { name: 'lodash', message: 'Use native methods', importNames: ['forEach'] },
          'moment',
        ],
      });

      expect(result[0].rules['no-restricted-imports']).toEqual([
        'error',
        {
          paths: [
            { name: 'lodash', message: 'Use native methods', importNames: ['forEach'] },
            'moment',
          ],
          patterns: [],
        },
      ]);
    });

    it('should handle git command failure gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      expect(() => {
        createNoRestrictedImportsOverride({
          restrictedImports: ['moment'],
        });
      }).toThrow('git command failed');
    });

    it('should handle require failure gracefully', () => {
      mockRequire.mockImplementation(() => {
        throw new Error('Cannot find module');
      });

      expect(() => {
        createNoRestrictedImportsOverride({
          restrictedImports: ['moment'],
        });
      }).toThrow('Cannot find module');
    });
  });

  describe('integration scenarios', () => {
    it('should work with real-world ESLint configuration', () => {
      const mockConfig = {
        extends: ['@elastic/eslint-config-kibana'],
        overrides: [
          {
            files: ['**/*.{js,mjs,ts,tsx}'],
            rules: {
              'no-restricted-imports': [
                'error',
                {
                  paths: ['lodash', { name: 'moment', message: 'Use @kbn/moment instead' }],
                  patterns: [
                    '@elastic/elasticsearch/lib/*',
                    { group: ['rxjs/operators/*'], message: 'Import from rxjs/operators' },
                  ],
                },
              ],
            },
          },
        ],
      };
      mockRequire.mockReturnValue(mockConfig);

      const result = createNoRestrictedImportsOverride({
        restrictedImports: ['react-router', { name: 'antd', message: 'Use @elastic/eui instead' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].rules['no-restricted-imports']).toEqual([
        'error',
        {
          paths: [
            'lodash',
            { name: 'moment', message: 'Use @kbn/moment instead' },
            'react-router',
            { name: 'antd', message: 'Use @elastic/eui instead' },
          ],
          patterns: [
            '@elastic/elasticsearch/lib/*',
            { group: ['rxjs/operators/*'], message: 'Import from rxjs/operators' },
          ],
        },
      ]);
    });
  });
});
