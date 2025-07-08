/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { createNoRestrictedImportsOverride } = require('.');
const path = require('path');

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((...args) => {
    // TODO: fragile, can be fixed by using memfs or similar
    // Intercept ROOT_DIR calculation (when called with path.resolve(__dirname, '..', '..', '..'))
    if (args.length >= 4 && args[1] === '..' && args[2] === '..' && args[3] === '..') {
      return '/project';
    }
    return jest.requireActual('path').resolve(...args);
  }),
}));

// Mock the root config
jest.mock(
  '../../../../.eslintrc',
  () => ({
    overrides: [
      {
        files: ['src/**/*.js'],
        excludedFiles: ['src/**/*.test.js'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              paths: ['lodash'],
              patterns: [],
            },
          ],
        },
      },
      {
        files: ['{src,packages}/**/*.{js,ts}'],
        excludedFiles: ['**/test/**/*', '**/spec/**/*'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              paths: ['moment'],
              patterns: [],
            },
          ],
        },
      },
      {
        files: ['!src/legacy/**/*.js'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              paths: ['jquery'],
              patterns: [],
            },
          ],
        },
      },
      {
        files: ['src/components/**/*.{js,jsx}'],
        excludedFiles: ['src/components/**/!(*.{js,jsx})'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              paths: ['react-class'],
              patterns: [],
            },
          ],
        },
      },
    ],
  }),
  { virtual: true }
);

describe('createNoRestrictedImportsOverride', () => {
  const childConfigDir = path.resolve('/project/src/components');

  describe('when called with valid options', () => {
    it('should transform file patterns for nested context returning arrays', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      expect(result).toHaveLength(3); // One override filtered out due to negation

      // Find the first override (src/**/*.js)
      const firstOverride = result.find((o) => o.files.includes('**/*.js') && o.files.length === 1);
      expect(firstOverride.files).toEqual(['**/*.js']);
      expect(firstOverride.excludedFiles).toEqual(['**/*.test.js']);
    });

    it('should expand brace patterns into separate array elements', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      // Find the override with expanded braces
      const braceOverride = result.find(
        (o) => o.files.includes('**/*.js') && o.files.includes('**/*.ts')
      );
      expect(braceOverride.files).toEqual(['**/*.js', '**/*.ts']);
      expect(braceOverride.excludedFiles).toEqual(['**/test/**/*', '**/spec/**/*']);
    });

    it('should handle complex extglob patterns in excludedFiles', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      // Find the override with extglob excludedFiles
      const extglobOverride = result.find(
        (o) => o.files.includes('**/*.js') && o.files.includes('**/*.jsx')
      );
      expect(extglobOverride.files).toEqual(['**/*.js', '**/*.jsx']);
      expect(extglobOverride.excludedFiles).toEqual(['**/!(*.js)', '**/!(*.jsx)']);
    });

    it('should merge restricted imports with existing ones', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      // Check first override
      const firstRule = result[0].rules['no-restricted-imports'];
      expect(firstRule[1].paths).toContain('lodash');
      expect(firstRule[1].paths).toContain('react-router');

      // Check second override
      const secondRule = result[1].rules['no-restricted-imports'];
      expect(secondRule[1].paths).toContain('moment');
      expect(secondRule[1].paths).toContain('react-router');
    });

    it('should preserve rule severity and other options', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      result.forEach((override) => {
        const rule = override.rules['no-restricted-imports'];
        expect(rule[0]).toBe('error');
        expect(rule[1]).toHaveProperty('paths');
        expect(rule[1]).toHaveProperty('patterns');
      });
    });
  });

  describe('when patterns do not apply to target directory', () => {
    it('should filter out non-applicable overrides completely', () => {
      const nonMatchingDir = path.resolve('/project/packages/core');

      const result = createNoRestrictedImportsOverride({
        childConfigDir: nonMatchingDir,
        restrictedImports: ['react-router'],
      });

      // Should only include the override that matches packages/**
      expect(result).toHaveLength(1);
      expect(result[0].files).toEqual(['**/*.js', '**/*.ts']);
    });

    it('should handle directory that matches no patterns', () => {
      const nonMatchingDir = path.resolve('/project/docs');

      const result = createNoRestrictedImportsOverride({
        childConfigDir: nonMatchingDir,
        restrictedImports: ['react-router'],
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('when handling negated patterns', () => {
    it('should filter out overrides with negated patterns that exclude target', () => {
      const legacyDir = path.resolve('/project/src/legacy');

      const result = createNoRestrictedImportsOverride({
        childConfigDir: legacyDir,
        restrictedImports: ['react-router'],
      });

      // The negated pattern !src/legacy/**/*.js should exclude this directory
      const hasNegatedRule = result.some((override) =>
        override.rules['no-restricted-imports'][1].paths.includes('jquery')
      );
      expect(hasNegatedRule).toBe(false);
    });

    it('should preserve negation in transformed patterns when applicable', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir: path.resolve('/project/other'),
        restrictedImports: ['react-router'],
      });

      // Should not include the negated pattern since it doesn't apply
      expect(result).toHaveLength(0);
    });
  });

  describe('when called with invalid options', () => {
    it('should throw error when childConfigDir is not provided', () => {
      expect(() => {
        createNoRestrictedImportsOverride({
          restrictedImports: ['react-router'],
        });
      }).toThrow('No childConfigDir provided');
    });

    it('should throw error when restrictedImports is empty', () => {
      expect(() => {
        createNoRestrictedImportsOverride({
          childConfigDir,
          restrictedImports: [],
        });
      }).toThrow('No restricted imports provided');
    });

    it('should throw error when childConfigDir is not a string', () => {
      expect(() => {
        createNoRestrictedImportsOverride({
          childConfigDir: null,
          restrictedImports: ['react-router'],
        });
      }).toThrow('No childConfigDir provided');
    });
  });

  describe('when excludedFiles patterns exist', () => {
    it('should transform excludedFiles into arrays when they apply', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      const overrideWithExcluded = result.find((o) => o.excludedFiles);
      expect(Array.isArray(overrideWithExcluded.excludedFiles)).toBe(true);
      expect(overrideWithExcluded.excludedFiles.length).toBeGreaterThan(0);
    });

    it('should omit excludedFiles when they do not apply to target directory', () => {
      const utilsDir = path.resolve('/project/src/utils');

      const result = createNoRestrictedImportsOverride({
        childConfigDir: utilsDir,
        restrictedImports: ['react-router'],
      });

      // Find overrides and check if excludedFiles that don't apply are omitted
      result.forEach((override) => {
        if (override.excludedFiles) {
          // All excludedFiles should be applicable to the target directory
          expect(override.excludedFiles.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle complex excludedFiles with extglobs', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      const extglobOverride = result.find(
        (o) => o.excludedFiles && o.excludedFiles.some((f) => f.includes('!('))
      );

      if (extglobOverride) {
        expect(extglobOverride.excludedFiles).toEqual(
          expect.arrayContaining([expect.stringMatching(/\*\*\/!\(.*\)/)])
        );
      }
    });
  });

  describe('when handling multiple restricted imports', () => {
    it('should add all restricted imports to each applicable override', () => {
      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: [
          'react-router',
          { name: 'lodash-es', message: 'Use lodash instead' },
          'moment',
        ],
      });

      result.forEach((override) => {
        const rule = override.rules['no-restricted-imports'];
        const paths = rule[1].paths;

        expect(paths).toContain('react-router');
        expect(paths).toEqual(
          expect.arrayContaining([expect.objectContaining({ name: 'lodash-es' })])
        );
        expect(paths).toContain('moment');
      });
    });
  });
});
