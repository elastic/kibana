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

describe('Pattern Transformation', () => {
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
    describe('WHEN patterns apply to the target directory', () => {
      describe('AND WHEN the pattern exactly matches the target directory', () => {
        it('SHOULD transform to dot notation', () => {
          const result = transformFilesPatterns('src/components', rootDir, targetDir);
          expect(result).toEqual(['.']);
        });
      });

      describe('AND WHEN the pattern targets files directly in the target directory', () => {
        it('SHOULD strip the directory prefix', () => {
          const result = transformFilesPatterns('src/components/*.js', rootDir, targetDir);
          expect(result).toEqual(['*.js']);
        });
      });

      describe('AND WHEN the pattern targets files in subdirectories', () => {
        it('SHOULD preserve the subdirectory structure', () => {
          const result = transformFilesPatterns('src/components/forms/*.js', rootDir, targetDir);
          expect(result).toEqual(['forms/*.js']);
        });
      });

      describe('AND WHEN the pattern uses globstar that matches the target', () => {
        it('SHOULD simplify to relative globstar', () => {
          const result = transformFilesPatterns('src/**/*.js', rootDir, targetDir);
          expect(result).toEqual(['**/*.js']);
        });
      });

      describe('AND WHEN the pattern has multiple levels with globstar', () => {
        it('SHOULD simplify to the matching portion', () => {
          const result = transformFilesPatterns('src/**/components/**/*.js', rootDir, targetDir);
          expect(result).toEqual(['**/*.js']);
        });
      });

      describe('AND WHEN multiple patterns are provided', () => {
        it('SHOULD transform each pattern individually', () => {
          const patterns = [
            'src/components/*.js',
            'src/components/*.ts',
            'src/components/forms/*.jsx',
          ];
          const result = transformFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toEqual(['*.js', '*.ts', 'forms/*.jsx']);
        });
      });

      describe('AND WHEN the pattern contains brace expansion', () => {
        it('SHOULD expand and transform each variation', () => {
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
    });

    describe('WHEN patterns negate the entire target directory', () => {
      describe('AND WHEN the pattern negates the exact target directory', () => {
        it('SHOULD exclude the entire override', () => {
          const result = transformFilesPatterns('!src/components', rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN the pattern negates all files with globstar', () => {
        it('SHOULD exclude the entire override', () => {
          const result = transformFilesPatterns('!src/components/**', rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN the pattern negates all direct children', () => {
        it('SHOULD exclude the entire override', () => {
          const result = transformFilesPatterns('!src/components/*', rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN the pattern uses wildcards that match the target directory', () => {
        it('SHOULD exclude the entire override', () => {
          const result = transformFilesPatterns('!src/comp*', rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN one pattern in an array excludes the target', () => {
        it('SHOULD exclude the entire override', () => {
          const patterns = [
            'src/**/*.js',
            '!src/components/**', // This excludes entire target
          ];
          const result = transformFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toBe(null);
        });
      });
    });

    describe('WHEN patterns negate specific files within the target', () => {
      describe('AND WHEN the pattern negates specific file extensions', () => {
        it('SHOULD transform to relative negation', () => {
          const result = transformFilesPatterns('!src/components/**/*.js', rootDir, targetDir);
          expect(result).toEqual(['!**/*.js']);
        });
      });

      describe('AND WHEN the pattern negates subdirectories while including others', () => {
        it('SHOULD transform both positive and negative patterns', () => {
          const patterns = ['src/components/**/*.js', '!src/components/deprecated/**'];
          const result = transformFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toEqual(['**/*.js', '!deprecated/**']);
        });
      });

      describe('AND WHEN multiple file patterns are negated', () => {
        it('SHOULD transform all patterns', () => {
          const patterns = [
            'src/components/**/*.js',
            'src/components/**/*.ts',
            '!src/components/**/*.test.js',
            '!src/components/**/*.test.ts',
          ];
          const result = transformFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toEqual(['**/*.js', '**/*.ts', '!**/*.test.js', '!**/*.test.ts']);
        });
      });

      describe('AND WHEN wildcard patterns are combined with negations', () => {
        it('SHOULD handle both types correctly', () => {
          const patterns = ['src/*/forms/*.js', '!src/*/forms/*.test.js'];
          const result = transformFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toEqual(['forms/*.js', '!forms/*.test.js']);
        });
      });

      describe('AND WHEN specific filenames are negated', () => {
        it('SHOULD preserve the filename specificity', () => {
          const patterns = ['src/components/**/*', '!src/components/**/index.js'];
          const result = transformFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toEqual(['**/*', '!**/index.js']);
        });
      });
    });

    describe('WHEN patterns target directories outside the target', () => {
      describe('AND WHEN the pattern targets a different directory', () => {
        it('SHOULD exclude the override', () => {
          const result = transformFilesPatterns('packages/**/*.js', rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN the pattern negates files outside the target', () => {
        it('SHOULD exclude the override', () => {
          const result = transformFilesPatterns('!src/utils/**/*.js', rootDir, targetDir);
          expect(result).toBe(null);
        });
      });
    });

    describe('WHEN handling edge cases', () => {
      describe('AND WHEN the input is null', () => {
        it('SHOULD return null', () => {
          const result = transformFilesPatterns(null, rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN the input is an empty array', () => {
        it('SHOULD return null', () => {
          const result = transformFilesPatterns([], rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN the array contains invalid patterns', () => {
        it('SHOULD skip invalid patterns and process valid ones', () => {
          const patterns = ['src/components/*.js', null, undefined, 123, 'src/components/*.ts'];
          const result = transformFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toEqual(['*.js', '*.ts']);
        });
      });

      describe('AND WHEN the pattern contains special characters', () => {
        it('SHOULD preserve the special characters', () => {
          const result = transformFilesPatterns('src/components/[a-z]*.js', rootDir, targetDir);
          expect(result).toEqual(['[a-z]*.js']);
        });
      });

      describe('AND WHEN the pattern uses extglob syntax', () => {
        it('SHOULD preserve the extglob pattern', () => {
          const result = transformFilesPatterns(
            'src/components/!(node_modules)/**/*.js',
            rootDir,
            targetDir
          );
          expect(result).toEqual(['!(node_modules)/**/*.js']);
        });
      });
    });
  });

  describe('transformExcludedFilesPatterns', () => {
    describe('WHEN transforming excluded patterns', () => {
      describe('AND WHEN the pattern targets files within the target directory', () => {
        it('SHOULD transform without special negation logic', () => {
          const result = transformExcludedFilesPatterns(
            'src/components/**/*.test.js',
            rootDir,
            targetDir
          );
          expect(result).toEqual(['**/*.test.js']);
        });
      });

      describe('AND WHEN the pattern is already negated', () => {
        it('SHOULD process as a regular pattern', () => {
          const result = transformExcludedFilesPatterns(
            '!src/components/**/*.js',
            rootDir,
            targetDir
          );
          expect(result).toEqual(['!**/*.js']);
        });
      });

      describe('AND WHEN multiple excluded patterns are provided', () => {
        it('SHOULD transform all patterns', () => {
          const patterns = [
            'src/components/**/*.test.js',
            'src/components/**/*.spec.js',
            '!src/components/**/important.test.js',
          ];
          const result = transformExcludedFilesPatterns(patterns, rootDir, targetDir);
          expect(result).toEqual(['**/*.test.js', '**/*.spec.js', '!**/important.test.js']);
        });
      });

      describe('AND WHEN the pattern targets files outside the target', () => {
        it('SHOULD exclude the override', () => {
          const result = transformExcludedFilesPatterns(
            'packages/**/*.test.js',
            rootDir,
            targetDir
          );
          expect(result).toBe(null);
        });
      });
    });
  });

  describe('transformSinglePattern', () => {
    describe('WHEN transforming literal paths', () => {
      describe('AND WHEN the path is within the target directory', () => {
        it('SHOULD return the relative path', () => {
          const result = transformSinglePattern('src/components/Button.js', rootDir, targetDir);
          expect(result).toBe('Button.js');
        });
      });

      describe('AND WHEN the path is outside the target directory', () => {
        it('SHOULD return null', () => {
          const result = transformSinglePattern('src/utils/helper.js', rootDir, targetDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN the path exactly matches the target directory', () => {
        it('SHOULD return dot notation', () => {
          const result = transformSinglePattern('src/components', rootDir, targetDir);
          expect(result).toBe('.');
        });
      });
    });

    describe('WHEN transforming glob patterns', () => {
      describe('AND WHEN the pattern uses simple wildcards', () => {
        it('SHOULD strip the directory prefix', () => {
          const result = transformSinglePattern('src/components/*.js', rootDir, targetDir);
          expect(result).toBe('*.js');
        });
      });

      describe('AND WHEN the pattern uses globstar', () => {
        it('SHOULD simplify to relative globstar', () => {
          const result = transformSinglePattern('src/**/*.js', rootDir, targetDir);
          expect(result).toBe('**/*.js');
        });
      });

      describe('AND WHEN the pattern has multiple path segments', () => {
        it('SHOULD preserve the relative structure', () => {
          const result = transformSinglePattern(
            'src/components/forms/inputs/*.js',
            rootDir,
            targetDir
          );
          expect(result).toBe('forms/inputs/*.js');
        });
      });
    });
  });

  describe('Integration scenarios', () => {
    describe('WHEN simulating real ESLint override transformations', () => {
      describe('AND WHEN patterns are already relative (rootDir === targetDir)', () => {
        it('SHOULD expand brace patterns correctly', () => {
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
      });

      describe('AND WHEN transforming x-pack plugin patterns', () => {
        it('SHOULD correctly handle nested plugin directory structures', () => {
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
      });

      describe('AND WHEN a negation targets the test directory itself', () => {
        it('SHOULD exclude the entire override', () => {
          const testDir = '/project/src/components/__tests__';
          const patterns = ['src/**/*.js', '!src/**/__tests__/**'];

          const result = transformFilesPatterns(patterns, rootDir, testDir);
          expect(result).toBe(null);
        });
      });

      describe('AND WHEN a negation targets only specific files within the directory', () => {
        it('SHOULD transform patterns normally', () => {
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
});
