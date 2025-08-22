/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  transformFilesPatterns,
  transformExcludedFilesPatterns,
  transformSinglePattern,
} = require('./transform_patterns');

describe('transform_patterns - Behavioral Tests', () => {
  const rootDir = '/project';
  const targetDir = '/project/src/components';

  // Suppress console.warn during tests
  const originalWarn = console.warn;
  beforeAll(() => {
    console.warn = jest.fn();
  });
  afterAll(() => {
    console.warn = originalWarn;
  });

  describe('transformFilesPatterns', () => {
    describe('when transforming patterns that apply to the target directory', () => {
      it('should transform exact directory match to dot', () => {
        const result = transformFilesPatterns('src/components', rootDir, targetDir);
        expect(result).toEqual(['.']);
      });

      it('should transform patterns for files directly in target directory', () => {
        const result = transformFilesPatterns('src/components/*.js', rootDir, targetDir);
        expect(result).toEqual(['*.js']);
      });

      it('should transform patterns for files in subdirectories', () => {
        const result = transformFilesPatterns('src/components/forms/*.js', rootDir, targetDir);
        expect(result).toEqual(['forms/*.js']);
      });

      it('should handle globstar patterns that match target', () => {
        const result = transformFilesPatterns('src/**/*.js', rootDir, targetDir);
        expect(result).toEqual(['**/*.js']);
      });

      it('should handle multiple pattern levels with globstar', () => {
        const result = transformFilesPatterns('src/**/components/**/*.js', rootDir, targetDir);
        expect(result).toEqual(['**/*.js']);
      });

      it('should transform array of patterns', () => {
        const patterns = [
          'src/components/*.js',
          'src/components/*.ts',
          'src/components/forms/*.jsx',
        ];
        const result = transformFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toEqual(['*.js', '*.ts', 'forms/*.jsx']);
      });

      it('should handle brace expansion in patterns', () => {
        const result = transformFilesPatterns(
          'src/components/**/*.{js,jsx,ts,tsx}',
          rootDir,
          targetDir
        );
        expect(result).toEqual(
          expect.arrayContaining(['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'])
        );
      });
    });

    describe('when handling negated patterns that should exclude entire override', () => {
      it('should return null when negating the exact target directory', () => {
        const result = transformFilesPatterns('!src/components', rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should return null when negating all files in target directory with /**', () => {
        const result = transformFilesPatterns('!src/components/**', rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should return null when negating all files in target directory with /*', () => {
        const result = transformFilesPatterns('!src/components/*', rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should return null when wildcard pattern matches target directory name', () => {
        const result = transformFilesPatterns('!src/comp*', rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should return null when ANY pattern in array excludes the target', () => {
        const patterns = [
          'src/**/*.js',
          '!src/components/**', // This excludes entire target
        ];
        const result = transformFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toBe(null);
      });
    });

    describe('when handling negated patterns for specific files within target', () => {
      it('should transform negated patterns for specific file extensions', () => {
        const result = transformFilesPatterns('!src/components/**/*.js', rootDir, targetDir);
        expect(result).toEqual(['!**/*.js']);
      });

      it('should transform negated patterns for subdirectories', () => {
        const patterns = ['src/components/**/*.js', '!src/components/deprecated/**'];
        const result = transformFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toEqual(['**/*.js', '!deprecated/**']);
      });

      it('should handle multiple negated file patterns', () => {
        const patterns = [
          'src/components/**/*.js',
          'src/components/**/*.ts',
          '!src/components/**/*.test.js',
          '!src/components/**/*.test.ts',
        ];
        const result = transformFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toEqual(['**/*.js', '**/*.ts', '!**/*.test.js', '!**/*.test.ts']);
      });

      it('should handle wildcard patterns with file-specific negation', () => {
        const patterns = ['src/*/forms/*.js', '!src/*/forms/*.test.js'];
        const result = transformFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toEqual(['forms/*.js', '!forms/*.test.js']);
      });

      it('should handle negated patterns with specific filenames', () => {
        const patterns = ['src/components/**/*', '!src/components/**/index.js'];
        const result = transformFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toEqual(['**/*', '!**/index.js']);
      });
    });

    describe('when handling patterns outside target directory', () => {
      it('should return null for patterns in different directories', () => {
        const result = transformFilesPatterns('packages/**/*.js', rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should return null for negated patterns outside target', () => {
        const result = transformFilesPatterns('!src/utils/**/*.js', rootDir, targetDir);
        expect(result).toBe(null);
      });
    });

    describe('when handling edge cases', () => {
      it('should handle null input', () => {
        const result = transformFilesPatterns(null, rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should handle empty array', () => {
        const result = transformFilesPatterns([], rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should skip invalid patterns in array', () => {
        const patterns = ['src/components/*.js', null, undefined, 123, 'src/components/*.ts'];
        const result = transformFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toEqual(['*.js', '*.ts']);
      });

      it('should handle patterns with special characters', () => {
        const result = transformFilesPatterns('src/components/[a-z]*.js', rootDir, targetDir);
        expect(result).toEqual(['[a-z]*.js']);
      });

      it('should handle extglob patterns', () => {
        const result = transformFilesPatterns(
          'src/components/!(node_modules)/**/*.js',
          rootDir,
          targetDir
        );
        expect(result).toEqual(['!(node_modules)/**/*.js']);
      });
    });
  });

  describe('transformExcludedFilesPatterns', () => {
    describe('when transforming excluded patterns', () => {
      it('should transform patterns normally without special negation logic', () => {
        const result = transformExcludedFilesPatterns(
          'src/components/**/*.test.js',
          rootDir,
          targetDir
        );
        expect(result).toEqual(['**/*.test.js']);
      });

      it('should process negated patterns as regular patterns', () => {
        const result = transformExcludedFilesPatterns(
          '!src/components/**/*.js',
          rootDir,
          targetDir
        );
        expect(result).toEqual(['!**/*.js']);
      });

      it('should handle array of excluded patterns', () => {
        const patterns = [
          'src/components/**/*.test.js',
          'src/components/**/*.spec.js',
          '!src/components/**/important.test.js',
        ];
        const result = transformExcludedFilesPatterns(patterns, rootDir, targetDir);
        expect(result).toEqual(['**/*.test.js', '**/*.spec.js', '!**/important.test.js']);
      });

      it('should return null for patterns outside target', () => {
        const result = transformExcludedFilesPatterns('packages/**/*.test.js', rootDir, targetDir);
        expect(result).toBe(null);
      });
    });
  });

  describe('transformSinglePattern', () => {
    describe('when transforming literal paths', () => {
      it('should transform literal file path within target', () => {
        const result = transformSinglePattern('src/components/Button.js', rootDir, targetDir);
        expect(result).toBe('Button.js');
      });

      it('should return null for literal path outside target', () => {
        const result = transformSinglePattern('src/utils/helper.js', rootDir, targetDir);
        expect(result).toBe(null);
      });

      it('should handle exact directory match', () => {
        const result = transformSinglePattern('src/components', rootDir, targetDir);
        expect(result).toBe('.');
      });
    });

    describe('when transforming glob patterns', () => {
      it('should handle simple wildcard patterns', () => {
        const result = transformSinglePattern('src/components/*.js', rootDir, targetDir);
        expect(result).toBe('*.js');
      });

      it('should handle globstar patterns', () => {
        const result = transformSinglePattern('src/**/*.js', rootDir, targetDir);
        expect(result).toBe('**/*.js');
      });

      it('should handle complex patterns with multiple segments', () => {
        const result = transformSinglePattern(
          'src/components/forms/inputs/*.js',
          rootDir,
          targetDir
        );
        expect(result).toBe('forms/inputs/*.js');
      });
    });
  });

  describe('Integration scenarios', () => {
    describe('when simulating real ESLint override transformations', () => {
      it('should handle patterns already relative (when rootDir === targetDir)', () => {
        const patterns = [
          '**/*.{js,jsx,ts,tsx}',
          '!**/*.test.{js,jsx,ts,tsx}',
          '!**/*.spec.{js,jsx,ts,tsx}',
        ];

        const result = transformFilesPatterns(patterns, rootDir, rootDir);
        expect(result).toEqual(
          expect.arrayContaining([
            '**/*.js',
            '**/*.jsx',
            '**/*.ts',
            '**/*.tsx',
            '!**/*.test.js',
            '!**/*.test.jsx',
            '!**/*.test.ts',
            '!**/*.test.tsx',
            '!**/*.spec.js',
            '!**/*.spec.jsx',
            '!**/*.spec.ts',
            '!**/*.spec.tsx',
          ])
        );
      });

      it('should correctly transform x-pack plugin patterns', () => {
        const xpackDir = '/project/x-pack/plugins/security';
        const patterns = [
          'x-pack/plugins/security/**/*.{js,ts}',
          '!x-pack/plugins/security/**/*.test.{js,ts}',
        ];

        const result = transformFilesPatterns(patterns, rootDir, xpackDir);
        expect(result).toEqual(
          expect.arrayContaining(['**/*.js', '**/*.ts', '!**/*.test.js', '!**/*.test.ts'])
        );
      });

      it('should exclude override when negation targets the test directory itself', () => {
        const testDir = '/project/src/components/__tests__';
        const patterns = ['src/**/*.js', '!src/**/__tests__/**'];

        const result = transformFilesPatterns(patterns, rootDir, testDir);
        expect(result).toBe(null); // Correct: override should not apply
      });

      it('should transform patterns when negation targets files within directory', () => {
        const testDir = '/project/src/components/__tests__';
        const patterns = [
          'src/**/*.js',
          '!src/**/*.test.js', // Only excludes .test.js files, not the directory
        ];

        const result = transformFilesPatterns(patterns, rootDir, testDir);
        expect(result).toEqual(['**/*.js', '!**/*.test.js']);
      });
    });
  });
});
