/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import { createNoRestrictedImportsOverride } from './no-restricted-imports';
import type { Linter } from 'eslint';

// Mock the root config loading
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((...args: string[]) => {
    const actualPath = jest.requireActual('path') as typeof path;
    return actualPath.resolve(...args);
  }),
}));

const mockRootConfig: Linter.Config = {
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'lodash',
                message: 'Use lodash-es instead',
              },
            ],
            patterns: [],
          },
        ],
      },
    },
    {
      files: ['x-pack/**/*.js'],
      rules: {
        'no-restricted-imports': [
          'warn',
          'underscore',
          {
            name: 'jquery',
            message: 'jQuery is not allowed',
          },
        ],
      },
    },
  ],
};

// Create a proper module mock
jest.mock('/kibana/.eslintrc.js', () => mockRootConfig, { virtual: true });
jest.mock('/custom/project/.eslintrc.js', () => mockRootConfig, { virtual: true });

describe('createNoRestrictedImportsOverride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should create override configuration with additional restrictions', () => {
      const callingDir = '/kibana/x-pack/plugins/security';
      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        additionalRestrictedImports: [
          {
            name: 'enzyme',
            message: 'Use @testing-library/react instead',
          },
        ],
      });

      expect(result.overrides).toBeDefined();
      expect(result.overrides.length).toBeGreaterThan(0);
    });

    it('should merge additional restrictions without duplicates', () => {
      const callingDir = '/kibana/src/plugins/data';
      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        additionalRestrictedImports: [
          {
            name: 'lodash', // This already exists in root config
            message: 'Different message', // Should not create duplicate
          },
          {
            name: 'moment',
            message: 'Use @kbn/moment instead',
          },
        ],
      });

      // Check that lodash appears only once
      const overrideWithRestrictions = result.overrides.find(
        (o: Linter.ConfigOverride<Linter.RulesRecord>) => o.rules?.['no-restricted-imports']
      );

      if (overrideWithRestrictions) {
        const rule = overrideWithRestrictions.rules!['no-restricted-imports'] as any;
        const paths = rule[1].paths;
        const lodashEntries = paths.filter(
          (p: any) => (typeof p === 'string' ? p : p.name) === 'lodash'
        );
        expect(lodashEntries.length).toBe(1);
      }
    });

    it('should handle string-based restrictions', () => {
      const callingDir = '/kibana/x-pack/plugins/ml';
      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        additionalRestrictedImports: [
          'react-dom/server', // Simple string format
          'deprecated-package',
        ],
      });

      expect(result.overrides).toBeDefined();
      const override = result.overrides[0];
      if (override?.rules?.['no-restricted-imports']) {
        const rule = override.rules['no-restricted-imports'] as any;
        expect(rule[1].paths).toContain('react-dom/server');
        expect(rule[1].paths).toContain('deprecated-package');
      }
    });
  });

  describe('options handling', () => {
    it('should respect mergeWithExisting option', () => {
      const callingDir = '/kibana/src/core';
      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        mergeWithExisting: false,
        additionalRestrictedImports: [
          {
            name: 'axios',
            message: 'Use core.http instead',
          },
        ],
      });

      const override = result.overrides.find(
        (o: Linter.ConfigOverride<Linter.RulesRecord>) => o.rules?.['no-restricted-imports']
      );
      if (override) {
        const rule = override.rules!['no-restricted-imports'] as any;
        expect(rule[1].paths.length).toBe(1);
        expect(rule[1].paths[0].name).toBe('axios');
      }
    });

    it('should apply custom override filter', () => {
      const callingDir = '/kibana/test';
      const filterFn = jest.fn((override: Linter.ConfigOverride<Linter.RulesRecord>) => {
        return !override.files?.some((f: string) => f.includes('test'));
      });

      createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        overrideFilter: filterFn,
        additionalRestrictedImports: [],
      });

      expect(filterFn).toHaveBeenCalled();
    });

    it('should use custom root directory', () => {
      const callingDir = '/custom/project/src';
      const customRoot = '/custom/project';

      const result = createNoRestrictedImportsOverride(callingDir, {
        rootDir: customRoot,
        rootConfigPath: path.join(customRoot, '.eslintrc.js'),
        additionalRestrictedImports: [],
      });

      expect(result).toBeDefined();
    });
  });

  describe('file pattern scoping', () => {
    it('should correctly scope glob patterns', () => {
      const callingDir = '/kibana/x-pack/plugins/security/public';

      // Mock a config with glob patterns
      const configWithGlobs: Linter.Config = {
        overrides: [
          {
            files: ['x-pack/plugins/**/*.ts'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'] }],
            },
          },
        ],
      };

      jest.doMock('/kibana/.eslintrc.js', () => configWithGlobs, { virtual: true });

      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        additionalRestrictedImports: [],
      });

      // Should have scoped the pattern appropriately
      expect(result.overrides.length).toBeGreaterThan(0);
      expect(result.overrides[0].files).toBeDefined();
    });

    it('should filter out non-applicable overrides', () => {
      const callingDir = '/kibana/src/core/server';

      // This directory shouldn't match x-pack patterns
      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        additionalRestrictedImports: [],
      });

      // Should only include overrides that apply to this directory
      const xpackOverride = result.overrides.find((o: Linter.ConfigOverride<Linter.RulesRecord>) =>
        o.files?.some((f: string) => f.includes('x-pack'))
      );
      expect(xpackOverride).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error if root config cannot be loaded', () => {
      const callingDir = '/kibana/src/plugins/data';

      expect(() => {
        createNoRestrictedImportsOverride(callingDir, {
          rootConfigPath: '/non/existent/path/.eslintrc.js',
          additionalRestrictedImports: [],
        });
      }).toThrow(/Failed to load root ESLint config/);
    });

    it('should handle configs without overrides gracefully', () => {
      const emptyConfig: Linter.Config = {
        rules: {
          'no-console': 'warn',
        },
      };

      jest.doMock('/kibana/.eslintrc.js', () => emptyConfig, { virtual: true });

      const callingDir = '/kibana/src/plugins/data';
      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        additionalRestrictedImports: [{ name: 'lodash' }],
      });

      expect(result.overrides).toEqual([]);
    });
  });

  describe('complex rule format handling', () => {
    it('should handle mixed legacy and modern formats', () => {
      const mixedConfig: Linter.Config = {
        overrides: [
          {
            files: ['**/*.ts'],
            rules: {
              'no-restricted-imports': [
                'error',
                'legacy-string',
                { name: 'legacy-object', message: 'No legacy' },
                {
                  paths: ['modern-path'],
                  patterns: ['src/legacy/**'],
                },
              ],
            },
          },
        ],
      };

      jest.doMock('/kibana/.eslintrc.js', () => mixedConfig, { virtual: true });

      const callingDir = '/kibana/src/plugins/data';
      const result = createNoRestrictedImportsOverride(callingDir, {
        rootConfigPath: '/kibana/.eslintrc.js',
        additionalRestrictedImports: [{ name: 'new-restriction' }],
      });

      const override = result.overrides[0];
      if (override?.rules?.['no-restricted-imports']) {
        const rule = override.rules['no-restricted-imports'] as any;
        const paths = rule[1].paths;

        // Should have all restrictions merged
        expect(paths).toContainEqual('legacy-string');
        expect(paths).toContainEqual({ name: 'legacy-object', message: 'No legacy' });
        expect(paths).toContainEqual('modern-path');
        expect(paths).toContainEqual({ name: 'new-restriction' });

        // Patterns should be preserved
        expect(rule[1].patterns).toContain('src/legacy/**');
      }
    });
  });
});
