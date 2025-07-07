/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');

// Mock modules before requiring the module under test
jest.mock('minimatch');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((...args) => {
    // TODO: fragile, can be fixed by using memfs or similar
    // Intercept ROOT_DIR calculation (when called with path.resolve(__dirname, '..', '..', '..'))
    if (args.length >= 4 && args[1] === '..' && args[2] === '..' && args[3] === '..') {
      return '/kibana';
    }
    return jest.requireActual('path').resolve(...args);
  }),
}));

describe('createNoRestrictedImportsOverride', () => {
  let minimatch;
  let createNoRestrictedImportsOverride;

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

  const setupModuleMocks = (rootConfig = DEFAULT_ROOT_CONFIG) => {
    jest.resetModules();
    jest.clearAllMocks();

    minimatch = require('minimatch');

    setupMinimatchMock();

    jest.doMock('../../../.eslintrc', () => rootConfig, { virtual: true });

    // Now require the module under test (it will use our mocked path.resolve)
    ({ createNoRestrictedImportsOverride } = require('./create_no_restricted_imports_override'));
  };

  let mockRootConfig;

  beforeEach(() => {
    mockRootConfig = createMockRootConfig();
    setupModuleMocks(mockRootConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not mutate the original root config', () => {
    const originalRootConfig = {
      extends: ['@kbn/eslint-config-base'],
      rules: { 'no-console': 'error' },
      overrides: [
        {
          files: ['x-pack/**/*.js'],
          rules: {
            'no-restricted-imports': [
              'error',
              {
                paths: ['lodash', { name: 'moment', message: 'Use date-fns' }],
                patterns: ['@internal/*'],
              },
            ],
            'no-console': 'warn',
          },
        },
      ],
    };

    // Create a deep copy to compare against later
    const rootConfigSnapshot = JSON.parse(JSON.stringify(originalRootConfig));

    // Setup mocks with the original config
    setupModuleMocks(originalRootConfig);

    // Call the function which should work with a clone, not the original
    createNoRestrictedImportsOverride({
      restrictedImports: ['jquery', { name: 'axios', message: 'Use fetch' }],
      childConfigDir: mockCurrentDir,
    });

    // Verify the original config hasn't been mutated
    expect(originalRootConfig).toEqual(rootConfigSnapshot);

    // Specifically check that the paths array wasn't mutated
    expect(originalRootConfig.overrides[0].rules['no-restricted-imports'][1].paths).toHaveLength(2);
    expect(originalRootConfig.overrides[0].rules['no-restricted-imports'][1].paths[0]).toBe(
      'lodash'
    );
    expect(originalRootConfig.overrides[0].rules['no-restricted-imports'][1].paths[1]).toEqual({
      name: 'moment',
      message: 'Use date-fns',
    });
  });

  describe('when no childConfigDir is provided', () => {
    it('should throw an error', () => {
      expect(() => {
        createNoRestrictedImportsOverride({ restrictedImports: ['lodash'] });
      }).toThrow(
        'No childConfigDir provided. Please pass __dirname in your nested .eslintrc.js file.'
      );
    });
  });

  describe('when no restricted imports are provided', () => {
    it('should throw an error', () => {
      expect(() => {
        createNoRestrictedImportsOverride({ childConfigDir: mockCurrentDir });
      }).toThrow('No restricted imports provided. Please specify at least one import to restrict.');
    });
  });

  describe('when restricted imports key is provided with empty array', () => {
    it('should throw an error', () => {
      expect(() => {
        createNoRestrictedImportsOverride({
          restrictedImports: [],
          childConfigDir: mockCurrentDir,
        });
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
        setupModuleMocks(mockRootConfig);
      });

      describe('and simple string restrictions are added', () => {
        it('should merge the restrictions', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['moment', 'jquery'],
            childConfigDir: mockCurrentDir,
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
            childConfigDir: mockCurrentDir,
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
          setupModuleMocks(mockRootConfig);
        });

        it('should deduplicate string restrictions', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['moment', 'jquery'],
            childConfigDir: mockCurrentDir,
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
            setupModuleMocks(mockRootConfig);
          });

          it('should replace existing restrictions with new ones', () => {
            const result = createNoRestrictedImportsOverride({
              restrictedImports: [
                { name: 'lodash', message: 'Different message' },
                { name: 'moment', importNames: ['format'] },
              ],
              childConfigDir: mockCurrentDir,
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
            setupModuleMocks(mockRootConfig);
          });

          it('should convert to modern format and merge', () => {
            const result = createNoRestrictedImportsOverride({
              restrictedImports: ['jquery'],
              childConfigDir: mockCurrentDir,
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
          setupModuleMocks(mockRootConfig);
        });

        it('should normalize all formats and merge', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['axios'],
            childConfigDir: mockCurrentDir,
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
        setupModuleMocks(mockRootConfig);
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
            childConfigDir: mockCurrentDir,
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
            childConfigDir: mockCurrentDir,
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
            childConfigDir: mockCurrentDir,
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
            childConfigDir: mockCurrentDir,
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
          setupModuleMocks(mockRootConfig);

          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
            childConfigDir: mockCurrentDir,
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

        setupModuleMocks(mockRootConfig);

        const result = createNoRestrictedImportsOverride({
          restrictedImports: ['lodash'],
          childConfigDir: subDir,
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
        setupModuleMocks(mockRootConfig);
      });

      it('should process all applicable overrides', () => {
        const result = createNoRestrictedImportsOverride({
          restrictedImports: ['jquery'],
          childConfigDir: mockCurrentDir,
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
          setupModuleMocks(mockRootConfig);
        });

        it('should only return overrides with the rule', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
            childConfigDir: mockCurrentDir,
          });

          expect(result).toHaveLength(1);
          expect(result[0].files).toEqual(['**/*.js']);
        });
      });

      describe('and rule has only severity without options', () => {
        beforeEach(() => {
          mockRootConfig.overrides = [createRestrictedImportsOverride('**/*.js', 'error')];
          setupModuleMocks(mockRootConfig);
        });

        it('should not modify the rule', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
            childConfigDir: mockCurrentDir,
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
          setupModuleMocks(mockRootConfig);
        });

        it('should preserve patterns when adding paths', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['moment'],
            childConfigDir: mockCurrentDir,
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
          mockRootConfig.overrides = [
            createRestrictedImportsOverride('x-pack/plugins/security/**/*.tsx', [
              'error',
              { paths: [], patterns: [] },
            ]),
          ];

          setupModuleMocks(mockRootConfig);
        });

        it('should still match parent directory patterns', () => {
          const result = createNoRestrictedImportsOverride({
            restrictedImports: ['lodash'],
            childConfigDir: '/kibana/x-pack/plugins/security/public/components/forms',
          });

          expect(result).toHaveLength(1);
          expect(result[0].files).toEqual(['**/*.tsx']);
        });
      });
    });
  });
});
