/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transformOverridesForNestedContext } = require('./transform_overrides_for_nested_context');

describe('transformOverridesForNestedContext', () => {
  const rootDir = '/project';
  const childConfigDir = '/project/src/components';

  describe('WHEN filtering overrides', () => {
    describe('AND WHEN a rule filter is provided', () => {
      it('SHOULD only include overrides that match the filter', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['src/components/**/*.ts'],
            rules: { 'other-rule': ['error'] },
          },
        ];

        const ruleFilter = (override) =>
          Boolean(override.rules && 'no-restricted-imports' in override.rules);

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          ruleFilter
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN a rule filter returns false for all overrides', () => {
      it('SHOULD return an empty array', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            rules: { 'other-rule': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => false
        );

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('WHEN transforming file patterns', () => {
    describe('AND WHEN patterns target the child directory', () => {
      it('SHOULD transform patterns to be relative to the child directory', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN patterns target nested subdirectories', () => {
      it('SHOULD transform patterns to maintain the relative path structure', () => {
        const overrides = [
          {
            files: ['src/components/forms/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['forms/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN patterns do not apply to the nested context', () => {
      it('SHOULD exclude those overrides from the result', () => {
        const overrides = [
          {
            files: ['packages/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['src/components/**/*.js'],
            rules: { 'other-rule': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'other-rule': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN patterns contain multiple file types', () => {
      it('SHOULD transform all patterns correctly', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js', 'src/components/**/*.jsx'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js', '**/*.jsx'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN patterns use brace expansion', () => {
      it('SHOULD expand and transform all patterns correctly', () => {
        const overrides = [
          {
            files: ['src/components/**/*.{js,jsx,ts,tsx}'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });
  });

  describe('WHEN handling negated patterns', () => {
    describe('AND WHEN patterns contain negated file types', () => {
      it('SHOULD preserve the negation and transform the path', () => {
        const overrides = [
          {
            files: ['!src/components/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['src/**/*.js'],
            rules: { 'no-restricted-imports': ['warn'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['!**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['warn'] },
          },
        ]);
      });
    });

    describe('AND WHEN negated patterns exclude the entire target directory', () => {
      it('SHOULD exclude the override from the result', () => {
        const overrides = [
          {
            // a little unintuitive, but this means "all js files except those in components"
            // and since our target is "components", this excludes everything
            // for our child scope
            files: ['src/**/*.js', '!src/components/**'],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            // and this one applies additionally to our child scope
            files: ['src/**/*.ts'],
            rules: { 'no-restricted-imports': ['warn'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.ts'],
            rules: { 'no-restricted-imports': ['warn'] },
          },
        ]);
      });
    });

    describe('AND WHEN all patterns are negated', () => {
      it('SHOULD preserve negated patterns as is', () => {
        const overrides = [
          {
            files: ['!**/*.test.js', '!**/*.spec.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['!**/*.test.js', '!**/*.spec.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });
  });

  describe('WHEN handling excludedFiles', () => {
    describe('AND WHEN excludedFiles patterns apply to the nested context', () => {
      it('SHOULD transform the patterns relative to the child directory', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            excludedFiles: ['src/components/**/*.test.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            excludedFiles: ['**/*.test.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN excludedFiles patterns do not apply to the nested context', () => {
      it('SHOULD omit the excludedFiles property', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            excludedFiles: ['packages/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN excludedFiles contains mixed positive and negated patterns', () => {
      it('SHOULD transform all patterns correctly', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            excludedFiles: ['src/components/**/*.test.js', '!src/components/**/important.test.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            excludedFiles: ['**/*.test.js', '!**/important.test.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN excludedFiles contains negated patterns only', () => {
      it('SHOULD preserve the negation and transform the path', () => {
        const overrides = [
          {
            files: ['src/components/**/*'],
            excludedFiles: ['!src/components/**/*.important.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*'],
            excludedFiles: ['!**/*.important.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });
  });

  describe('WHEN preserving override properties', () => {
    describe('AND WHEN overrides contain additional properties', () => {
      it('SHOULD preserve all non-file-pattern properties', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
            env: { node: true },
            parserOptions: { ecmaVersion: 2020 },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
            env: { node: true },
            parserOptions: { ecmaVersion: 2020 },
          },
        ]);
      });
    });

    describe('AND WHEN overrides do not have excludedFiles', () => {
      it('SHOULD not add an excludedFiles property', () => {
        const overrides = [
          {
            files: ['src/components/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });
  });

  describe('WHEN handling edge cases', () => {
    describe('AND WHEN the overrides array is empty', () => {
      it('SHOULD return an empty array', () => {
        const result = transformOverridesForNestedContext([], rootDir, childConfigDir, () => true);

        expect(result).toEqual([]);
      });
    });

    describe('AND WHEN overrides have empty files arrays', () => {
      it('SHOULD skip those overrides', () => {
        const overrides = [
          {
            files: [],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['src/components/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN overrides are missing the files property', () => {
      it('SHOULD skip those overrides', () => {
        const overrides = [
          {
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['src/components/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN working with deeply nested child directories', () => {
      it('SHOULD handle the transformation correctly', () => {
        const nestedChildDir = '/project/src/components/shared';
        const overrides = [
          {
            files: ['src/components/shared/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          nestedChildDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ]);
      });
    });

    describe('AND WHEN patterns would exclude the entire target after transformation', () => {
      it('SHOULD exclude those overrides from the result', () => {
        const overrides = [
          {
            files: ['!src/components/**'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('WHEN handling complex scenarios', () => {
    describe('AND WHEN multiple overrides have mixed patterns and exclusions', () => {
      it('SHOULD transform all applicable overrides correctly', () => {
        const overrides = [
          {
            files: ['src/**/*.{js,ts}', '!src/**/*.test.{js,ts}'],
            excludedFiles: ['src/**/deprecated/**'],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['src/components/**/*.test.{js,ts}'],
            rules: { 'no-restricted-imports': ['warn'] },
          },
          {
            files: ['packages/**/*.js'],
            rules: { 'no-restricted-imports': ['error'] },
          },
        ];

        const result = transformOverridesForNestedContext(
          overrides,
          rootDir,
          childConfigDir,
          () => true
        );

        expect(result).toEqual([
          {
            files: ['**/*.js', '**/*.ts', '!**/*.test.js', '!**/*.test.ts'],
            excludedFiles: ['**/deprecated/**'],
            rules: { 'no-restricted-imports': ['error'] },
          },
          {
            files: ['**/*.test.js', '**/*.test.ts'],
            rules: { 'no-restricted-imports': ['warn'] },
          },
        ]);
      });
    });
  });
});
