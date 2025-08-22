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

  describe('when transforming overrides for nested context', () => {
    it('should filter overrides using the provided rule filter', () => {
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

      expect(result).toHaveLength(1);
      expect(result[0].rules).toHaveProperty('no-restricted-imports');
      expect(result[0].files).toEqual(['**/*.js']);
    });

    it('should transform file patterns relative to child directory', () => {
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

      expect(result[0].files).toEqual(['**/*.js']);
    });

    it('should transform nested subdirectory patterns', () => {
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

      expect(result[0].files).toEqual(['forms/**/*.js']);
    });

    it('should exclude overrides that do not apply to nested context', () => {
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

      // Only the second override should be included
      expect(result).toHaveLength(1);
      expect(result[0].files).toEqual(['**/*.js']);
      expect(result[0].rules).toHaveProperty('other-rule');
    });

    it('should transform excludedFiles patterns', () => {
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

      expect(result[0]).toEqual({
        files: ['**/*.js'],
        excludedFiles: ['**/*.test.js'],
        rules: { 'no-restricted-imports': ['error'] },
      });
    });

    it('should preserve all other override properties', () => {
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

      expect(result[0]).toEqual({
        files: ['**/*.js'],
        rules: { 'no-restricted-imports': ['error'] },
        env: { node: true },
        parserOptions: { ecmaVersion: 2020 },
      });
    });

    it('should handle overrides without excludedFiles', () => {
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

      expect(result[0]).not.toHaveProperty('excludedFiles');
    });

    it('should omit excludedFiles when they do not apply to nested context', () => {
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

      expect(result[0].files).toEqual(['**/*.js']);
      expect(result[0]).not.toHaveProperty('excludedFiles');
    });

    it('should handle multiple file patterns', () => {
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

      expect(result[0].files).toEqual(['**/*.js', '**/*.jsx']);
    });

    it('should transform negated files patterns to apply to non-matching files', () => {
      const overrides = [
        {
          files: ['!src/components/**/*.js'], // Apply to all EXCEPT .js in components
          rules: { 'no-restricted-imports': ['error'] },
        },
        {
          files: ['src/**/*.js'], // Apply to all .js files under src
          rules: { 'no-restricted-imports': ['warn'] },
        },
      ];

      const result = transformOverridesForNestedContext(
        overrides,
        rootDir,
        childConfigDir,
        () => true
      );

      // Both overrides should be included and transformed
      expect(result).toHaveLength(2);

      // First: applies to everything except .js files
      expect(result[0].files).toEqual(['!**/*.js']);
      expect(result[0].rules['no-restricted-imports'][0]).toBe('error');

      // Second: applies to all .js files
      expect(result[1].files).toEqual(['**/*.js']);
      expect(result[1].rules['no-restricted-imports'][0]).toBe('warn');
    });

    it('should exclude override when negated pattern excludes entire target directory', () => {
      const overrides = [
        {
          files: ['src/**/*.js', '!src/components/**'], // Excludes entire components dir
          rules: { 'no-restricted-imports': ['error'] },
        },
        {
          files: ['src/**/*.ts'], // Should still apply
          rules: { 'no-restricted-imports': ['warn'] },
        },
      ];

      const result = transformOverridesForNestedContext(
        overrides,
        rootDir,
        childConfigDir,
        () => true
      );

      // First override excluded, second included
      expect(result).toHaveLength(1);
      expect(result[0].files).toEqual(['**/*.ts']);
      expect(result[0].rules['no-restricted-imports'][0]).toBe('warn');
    });

    it('should handle mixed positive and negated patterns in excludedFiles', () => {
      const overrides = [
        {
          files: ['src/components/**/*.js'],
          excludedFiles: [
            'src/components/**/*.test.js',
            '!src/components/**/important.test.js', // Don't exclude important tests
          ],
          rules: { 'no-restricted-imports': ['error'] },
        },
      ];

      const result = transformOverridesForNestedContext(
        overrides,
        rootDir,
        childConfigDir,
        () => true
      );

      expect(result[0]).toEqual({
        files: ['**/*.js'],
        excludedFiles: ['**/*.test.js', '!**/important.test.js'],
        rules: { 'no-restricted-imports': ['error'] },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty overrides array', () => {
      const result = transformOverridesForNestedContext([], rootDir, childConfigDir, () => true);

      expect(result).toEqual([]);
    });

    it('should handle rule filter that returns false for all overrides', () => {
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

    it('should skip overrides with empty files array', () => {
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

      expect(result).toHaveLength(1);
      expect(result[0].files).toEqual(['**/*.js']);
    });

    it('should skip overrides without files property', () => {
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

      expect(result).toHaveLength(1);
      expect(result[0].files).toEqual(['**/*.js']);
    });

    it('should handle complex glob patterns with brace expansion', () => {
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

      expect(result[0].files).toEqual(
        expect.arrayContaining(['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'])
      );
    });

    it('should handle patterns with special directories in nested context', () => {
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

      expect(result[0].files).toEqual(['**/*.js']);
    });

    it('should handle override with only negated patterns in files', () => {
      const overrides = [
        {
          files: ['!**/*.test.js', '!**/*.spec.js'], // Apply to all except test files
          rules: { 'no-restricted-imports': ['error'] },
        },
      ];

      const result = transformOverridesForNestedContext(
        overrides,
        rootDir,
        childConfigDir,
        () => true
      );

      // Should transform the negated patterns
      expect(result).toHaveLength(1);
      expect(result[0].files).toEqual(['!**/*.test.js', '!**/*.spec.js']);
    });

    it('should handle complex scenario with multiple overrides and patterns', () => {
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
          files: ['packages/**/*.js'], // Doesn't apply to our target
          rules: { 'no-restricted-imports': ['error'] },
        },
      ];

      const result = transformOverridesForNestedContext(
        overrides,
        rootDir,
        childConfigDir,
        () => true
      );

      expect(result).toHaveLength(2);

      // First override
      expect(result[0].files).toEqual(
        expect.arrayContaining(['**/*.js', '**/*.ts', '!**/*.test.js', '!**/*.test.ts'])
      );
      expect(result[0].excludedFiles).toEqual(['**/deprecated/**']);

      // Second override
      expect(result[1].files).toEqual(expect.arrayContaining(['**/*.test.js', '**/*.test.ts']));
    });
  });

  describe('validation of source implementation', () => {
    it('should correctly use transformFilesPatterns for files', () => {
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

      // Verify the transformation is correct
      expect(result[0].files).toEqual(['**/*.js']);
    });

    it('should correctly use transformExcludedFilesPatterns for excludedFiles', () => {
      const overrides = [
        {
          files: ['src/components/**/*'],
          excludedFiles: ['!src/components/**/*.important.js'], // Don't exclude important files
          rules: { 'no-restricted-imports': ['error'] },
        },
      ];

      const result = transformOverridesForNestedContext(
        overrides,
        rootDir,
        childConfigDir,
        () => true
      );

      // excludedFiles negation should be preserved
      expect(result[0].excludedFiles).toEqual(['!**/*.important.js']);
    });

    it('should handle when transformFilesPatterns returns null', () => {
      const overrides = [
        {
          files: ['!src/components/**'], // Excludes entire target
          rules: { 'no-restricted-imports': ['error'] },
        },
      ];

      const result = transformOverridesForNestedContext(
        overrides,
        rootDir,
        childConfigDir,
        () => true
      );

      // Override should be excluded
      expect(result).toHaveLength(0);
    });
  });
});
