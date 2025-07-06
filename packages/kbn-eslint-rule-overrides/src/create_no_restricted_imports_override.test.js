/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-new-func */

const path = require('path');

// Mock modules before requiring the module under test
jest.mock('child_process');
jest.mock('minimatch');

describe('createNoRestrictedImportsOverride', () => {
  let execSync;
  let minimatch;
  let createNoRestrictedImportsOverride;

  const mockRootDir = '/kibana';
  const mockCurrentDir = '/kibana/x-pack/plugins/security';

  const DEFAULT_ROOT_CONFIG = {
    extends: ['@kbn/eslint-config-base'],
    rules: { 'no-console': 'error' },
    overrides: [],
  };

  const createMockRootConfig = (overrides = []) => ({
    ...DEFAULT_ROOT_CONFIG,
    overrides,
  });

  const createRestrictedImportsOverride = (files, rule) => ({
    files: Array.isArray(files) ? files : [files],
    rules: {
      'no-restricted-imports': rule,
    },
  });

  const setupMinimatchMock = (customImplementation) => {
    minimatch.mockImplementation(
      customImplementation ||
        ((target, pattern) => {
          // Simple implementation for testing
          if (pattern.includes('**')) {
            const base = pattern.split('**')[0].replace(/[\\/]+$/, '');
            return target.startsWith(base);
          }
          return target === pattern;
        })
    );
  };

  const setupModuleMocks = (currentDir = mockCurrentDir, rootConfig = DEFAULT_ROOT_CONFIG) => {
    jest.resetModules();
    jest.clearAllMocks();

    // Get mocked modules
    execSync = require('child_process').execSync;
    minimatch = require('minimatch');

    // Setup default mocks
    execSync.mockReturnValue(`${mockRootDir}\n`);
    setupMinimatchMock();

    // Mock the root config require
    jest.doMock('../../../.eslintrc', () => rootConfig, { virtual: true });

    // Create a custom implementation that properly handles mocking
    jest.doMock('./create_no_restricted_imports_override', () => {
      const originalModule = jest.requireActual('./create_no_restricted_imports_override');
      const originalFunc = originalModule.createNoRestrictedImportsOverride.toString();

      // Create a new function with injected dependencies
      const createFunction = new Function(
        'execSync',
        'path',
        'minimatch',
        '__dirname',
        'require',
        `return ${originalFunc}`
      )(execSync, path, minimatch, currentDir, (requirePath) => {
        if (requirePath.endsWith('.eslintrc')) {
          return rootConfig;
        }
        return jest.requireActual(requirePath);
      });

      return {
        createNoRestrictedImportsOverride: createFunction,
      };
    });

    ({ createNoRestrictedImportsOverride } = require('./create_no_restricted_imports_override'));
  };

  let mockRootConfig;

  beforeEach(() => {
    mockRootConfig = createMockRootConfig();
    setupModuleMocks(mockCurrentDir, mockRootConfig);
  });

  describe('when no restricted imports are provided', () => {
    it('should throw an error', () => {
      expect(() => {
        createNoRestrictedImportsOverride();
      }).toThrow('No restricted imports provided. Please specify at least one import to restrict.');
    });
  });

  describe('when restricted imports key is provided with empty array', () => {
    it('should throw an error', () => {
      expect(() => {
        createNoRestrictedImportsOverride({ restrictedImports: [] });
      }).toThrow('No restricted imports provided. Please specify at least one import to restrict.');
    });
  });

  describe('when restricted imports are provided', () => {
    describe('and the root config has matching overrides', () => {
      beforeEach(() => {
        mockRootConfig.overrides = [
          createRestrictedImportsOverride('x-pack/**/*.{js,mjs,ts,tsx}', [
            'error',
            { paths: ['lodash'], patterns: [] },
          ]),
        ];
      });

      describe('and simple string restrictions are added', () => {
        it('should merge the restrictions', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['moment', 'jquery'],
          });

          expect(result).toHaveLength(1);
          expect(result[0].rules['no-restricted-imports']).toEqual([
            'error',
            {
              paths: ['lodash', 'moment', 'jquery'],
              patterns: [],
            },
          ]);
        });
      });

      describe('and object restrictions with properties are added', () => {
        it('should merge the restrictions with their properties', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: [
              {
                name: 'react-router-dom',
                message: 'Use @kbn/shared-ux-router instead',
              },
              {
                name: '@emotion/react',
                importNames: ['css', 'jsx'],
                message: 'Use @emotion/css instead',
              },
            ],
          });

          expect(result).toHaveLength(1);
          const rule = result[0].rules['no-restricted-imports'];
          expect(rule[1].paths).toHaveLength(3);
          expect(rule[1].paths[0]).toBe('lodash');
          expect(rule[1].paths[1]).toEqual({
            name: 'react-router-dom',
            message: 'Use @kbn/shared-ux-router instead',
          });
          expect(rule[1].paths[2]).toEqual({
            name: '@emotion/react',
            importNames: ['css', 'jsx'],
            message: 'Use @emotion/css instead',
          });
        });
      });

      describe('and duplicate imports are added', () => {
        beforeEach(() => {
          mockRootConfig.overrides[0].rules['no-restricted-imports'] = [
            'error',
            { paths: ['lodash', 'moment'], patterns: [] },
          ];
        });

        it('should deduplicate string restrictions', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['moment', 'jquery'],
          });

          const paths = result[0].rules['no-restricted-imports'][1].paths;
          expect(paths).toEqual(['lodash', 'moment', 'jquery']);
          expect(paths.filter((p) => p === 'moment')).toHaveLength(1);
        });

        describe('and object restrictions have the same name', () => {
          beforeEach(() => {
            mockRootConfig.overrides[0].rules['no-restricted-imports'] = [
              'error',
              {
                paths: [{ name: 'lodash', message: 'Use lodash-es' }, 'moment'],
                patterns: [],
              },
            ];
          });

          it('should replace existing restrictions with new ones', () => {
            const result = createNoRestrictedImportsOverride({
              restrictedImports: [
                { name: 'lodash', message: 'Different message' },
                { name: 'moment', importNames: ['format'] },
              ],
            });

            const paths = result[0].rules['no-restricted-imports'][1].paths;
            expect(paths).toHaveLength(2);
            expect(paths[0]).toEqual({ name: 'lodash', message: 'Different message' });
            expect(paths[1]).toEqual({ name: 'moment', importNames: ['format'] });
          });
        });
      });
    });

    describe('and the root config uses legacy format', () => {
      const testLegacyFormat = (description, legacyRule, expectedPaths, expectedPatterns = []) => {
        describe(description, () => {
          beforeEach(() => {
            mockRootConfig.overrides = [createRestrictedImportsOverride('**/*.js', legacyRule)];
          });

          it('should convert to modern format and merge', () => {
            const result = createNoRestrictedImportsOverride({
              restrictedImports: ['jquery'],
            });

            const rule = result[0].rules['no-restricted-imports'];
            expect(rule[1].paths).toEqual([...expectedPaths, 'jquery']);
            expect(rule[1].patterns).toEqual(expectedPatterns);
          });
        });
      };

      testLegacyFormat(
        'and legacy string array format is used',
        ['error', 'lodash', 'moment'],
        ['lodash', 'moment']
      );

      describe('and mixed formats are used', () => {
        beforeEach(() => {
          mockRootConfig.overrides = [
            createRestrictedImportsOverride('**/*.ts', [
              'error',
              'lodash',
              { name: 'moment', message: 'Use date-fns' },
              { paths: ['jquery'], patterns: ['react-*'] },
            ]),
          ];
        });

        it('should normalize all formats and merge', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['axios'],
          });

          const rule = result[0].rules['no-restricted-imports'];
          expect(rule[1].paths).toContain('lodash');
          expect(rule[1].paths).toContainEqual({ name: 'moment', message: 'Use date-fns' });
          expect(rule[1].paths).toContain('jquery');
          expect(rule[1].paths).toContain('axios');
          expect(rule[1].patterns).toEqual(['react-*']);
        });
      });
    });

    describe('and file pattern filtering is applied', () => {
      const setupOverridesWithFiles = (overrides) => {
        mockRootConfig.overrides = overrides;
      };

      describe('and current directory matches override patterns', () => {
        beforeEach(() => {
          setupOverridesWithFiles([
            createRestrictedImportsOverride('packages/**/*.js', [
              'error',
              { paths: ['lodash'], patterns: [] },
            ]),
            createRestrictedImportsOverride('x-pack/**/*.js', [
              'error',
              { paths: ['moment'], patterns: [] },
            ]),
          ]);
        });

        it('should only return matching overrides', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['jquery'],
          });

          expect(result).toHaveLength(1);
          expect(result[0].rules['no-restricted-imports'][1].paths).toEqual(['moment', 'jquery']);
        });
      });

      describe('and glob patterns are used', () => {
        beforeEach(() => {
          setupOverridesWithFiles([
            createRestrictedImportsOverride('x-pack/plugins/**/*.{ts,tsx}', [
              'error',
              { paths: [], patterns: [] },
            ]),
          ]);
        });

        it('should adjust file patterns relative to current directory', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
          });

          expect(result).toHaveLength(1);
          expect(result[0].files).toEqual(['**/*.{ts,tsx}']);
        });
      });

      describe('and exact directory matches are used', () => {
        beforeEach(() => {
          // For this specific test, we need to update the minimatch mock
          setupMinimatchMock((target, pattern) => {
            // When checking exact directory matches, dirname of the absolute path
            // should match the current directory
            if (target === mockCurrentDir && pattern === mockCurrentDir) {
              return true;
            }

            // Also handle the case where pattern is the absolute path with glob
            const patternDir = pattern.includes('*') ? path.dirname(pattern) : pattern;
            if (target === mockCurrentDir && patternDir === mockCurrentDir) {
              return true;
            }

            // Default behavior
            if (pattern.includes('**')) {
              const base = pattern.split('**')[0].replace(/[\\/]+$/, '');
              return target.startsWith(base);
            }
            return target === pattern;
          });

          setupOverridesWithFiles([
            createRestrictedImportsOverride('x-pack/plugins/security/*.js', [
              'error',
              { paths: [], patterns: [] },
            ]),
          ]);
        });

        it('should adjust file patterns to current directory', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
          });

          expect(result).toHaveLength(1);
          expect(result[0].files).toEqual(['*.js']);
        });
      });

      describe('and no overrides match current directory', () => {
        beforeEach(() => {
          setupOverridesWithFiles([
            createRestrictedImportsOverride('packages/**/*.js', [
              'error',
              { paths: [], patterns: [] },
            ]),
          ]);
        });

        it('should return an empty array', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
          });

          expect(result).toEqual([]);
        });
      });
    });

    describe('and single star patterns are used in various ways', () => {
      const testSingleStarPattern = (description, files, expectedFiles) => {
        it(description, () => {
          mockRootConfig.overrides = [
            createRestrictedImportsOverride(files, ['error', { paths: [], patterns: [] }]),
          ];

          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
          });

          expect(result).toHaveLength(1);
          expect(result[0].files).toEqual(expectedFiles);
        });
      };

      testSingleStarPattern(
        'should handle single star with multiple extensions',
        'x-pack/plugins/security/*.{js,ts,tsx}',
        ['*.{js,ts,tsx}']
      );

      it('should handle patterns with single star in subdirectories', () => {
        const subDir = '/kibana/x-pack/plugins/security/public';

        setupMinimatchMock((target, pattern) => {
          // Handle the subdirectory case
          if (target === subDir && pattern === subDir) {
            return true;
          }

          // Handle path with single star
          const patternDir = pattern.includes('*') ? path.dirname(pattern) : pattern;
          if (target === subDir && patternDir === subDir) {
            return true;
          }

          // Default behavior
          if (pattern.includes('**')) {
            const base = pattern.split('**')[0].replace(/[\\/]+$/, '');
            return target.startsWith(base);
          }
          return target === pattern;
        });

        mockRootConfig.overrides = [
          createRestrictedImportsOverride('x-pack/plugins/security/public/*.js', [
            'error',
            { paths: [], patterns: [] },
          ]),
        ];

        setupModuleMocks(subDir, mockRootConfig);

        const result = createNoRestrictedImportsOverride({
          restrictedImports: ['lodash'],
        });

        expect(result).toHaveLength(1);
        expect(result[0].files).toEqual(['*.js']);
      });

      testSingleStarPattern(
        'should prioritize double star over single star in mixed patterns',
        'x-pack/**/security/*.js',
        ['**/security/*.js']
      );
    });

    describe('and multiple overrides apply', () => {
      beforeEach(() => {
        mockRootConfig.overrides = [
          createRestrictedImportsOverride('x-pack/**/*.js', [
            'error',
            { paths: ['lodash'], patterns: [] },
          ]),
          createRestrictedImportsOverride('x-pack/plugins/**/*.ts', [
            'warn',
            { paths: ['moment'], patterns: [] },
          ]),
          createRestrictedImportsOverride('x-pack/plugins/security/**/*', [
            'error',
            { paths: [], patterns: ['@emotion/*'] },
          ]),
        ];
      });

      it('should process all applicable overrides', () => {
        const result = createNoRestrictedImportsOverride({
          restrictedImports: ['jquery'],
        });

        expect(result).toHaveLength(3);

        // First override
        expect(result[0].rules['no-restricted-imports'][0]).toBe('error');
        expect(result[0].rules['no-restricted-imports'][1].paths).toEqual(['lodash', 'jquery']);

        // Second override - note different severity
        expect(result[1].rules['no-restricted-imports'][0]).toBe('warn');
        expect(result[1].rules['no-restricted-imports'][1].paths).toEqual(['moment', 'jquery']);

        // Third override
        expect(result[2].rules['no-restricted-imports'][1].paths).toEqual(['jquery']);
        expect(result[2].rules['no-restricted-imports'][1].patterns).toEqual(['@emotion/*']);
      });
    });

    describe('and edge cases are encountered', () => {
      describe('and some overrides lack no-restricted-imports rule', () => {
        beforeEach(() => {
          mockRootConfig.overrides = [
            {
              files: ['**/*.js'],
              rules: {
                'no-console': 'warn',
              },
            },
            createRestrictedImportsOverride('x-pack/**/*.js', [
              'error',
              { paths: [], patterns: [] },
            ]),
          ];
        });

        it('should only return overrides with the rule', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
          });

          expect(result).toHaveLength(1);
          expect(result[0].files).toEqual(['**/*.js']);
        });
      });

      describe('and rule has only severity without options', () => {
        beforeEach(() => {
          mockRootConfig.overrides = [createRestrictedImportsOverride('**/*.js', 'error')];
        });

        it('should not modify the rule', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
          });

          expect(result[0].rules['no-restricted-imports']).toBe('error');
        });
      });

      describe('and patterns exist alongside paths', () => {
        beforeEach(() => {
          mockRootConfig.overrides = [
            createRestrictedImportsOverride('**/*.ts', [
              'error',
              {
                paths: ['lodash'],
                patterns: [
                  {
                    group: ['@internal/*'],
                    message: 'Internal modules are not allowed',
                  },
                  'test-*',
                ],
              },
            ]),
          ];
        });

        it('should preserve patterns when adding paths', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['moment'],
          });

          const rule = result[0].rules['no-restricted-imports'];
          expect(rule[1].paths).toEqual(['lodash', 'moment']);
          expect(rule[1].patterns).toEqual([
            {
              group: ['@internal/*'],
              message: 'Internal modules are not allowed',
            },
            'test-*',
          ]);
        });
      });

      describe('and current directory is deeply nested', () => {
        beforeEach(() => {
          const deepDir = '/kibana/x-pack/plugins/security/public/components/forms';

          mockRootConfig.overrides = [
            createRestrictedImportsOverride('x-pack/plugins/security/**/*.tsx', [
              'error',
              { paths: [], patterns: [] },
            ]),
          ];

          setupModuleMocks(deepDir, mockRootConfig);
        });

        it('should still match parent directory patterns', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
          });

          expect(result).toHaveLength(1);
          expect(result[0].files).toEqual(['**/*.tsx']);
        });
      });
    });
  });
});
