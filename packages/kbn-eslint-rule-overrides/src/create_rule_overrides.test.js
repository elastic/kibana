/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  createRuleOverrides,
  normalizeRuleConfig,
  normalizeSeverity,
  applyDefaultHandler,
} = require('./create_rule_overrides');

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((...args) => {
    if (args.length === 4 && args.slice(1).join('/') === '../../..') {
      return '/project';
    }
    return jest.requireActual('path').resolve(...args);
  }),
}));

// More elaborate mock to test complex scenarios
jest.mock('../../../.eslintrc', () => ({
  overrides: [
    // Pattern with brace expansion and multiple extensions
    {
      files: ['src/components/**/*.{js,jsx,ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { paths: ['lodash'], patterns: ['@internal/*'] }],
        'no-console': ['warn', { allow: ['error'] }],
        complexity: ['warn', { max: 10 }],
      },
    },
    // Pattern with multiple glob levels
    {
      files: ['src/**/components/**/*.js'],
      rules: {
        'no-debugger': ['error'],
        'no-restricted-imports': ['error', { paths: ['moment'], patterns: [] }],
      },
    },
    // Pattern that doesn't match our directory
    {
      files: ['packages/**/*.{ts,tsx}'],
      rules: {
        'other-rule': ['error'],
        'no-unused-vars': ['warn'],
      },
    },
    // Pattern with negation
    {
      files: ['src/**/*.js', '!src/**/*.test.js'],
      excludedFiles: ['src/**/*.mock.js'],
      rules: {
        'no-restricted-imports': ['warn', { paths: ['react-router'], patterns: [] }],
        'import/order': ['error', { groups: ['builtin', 'external'] }],
      },
    },
    // X-pack patterns (won't match src/components)
    {
      files: ['x-pack/**/plugins/**/*.{js,ts}'],
      rules: {
        'import/no-commonjs': ['error'],
      },
    },
    // Exact file match
    {
      files: ['src/components/Button.js'],
      rules: {
        'specific-rule': ['error'],
      },
    },
    // Pattern with wildcards at different levels
    {
      files: ['src/*/index.js', 'src/**/*/index.ts'],
      rules: {
        'no-default-export': ['off'],
      },
    },
    // Pattern that partially matches
    {
      files: ['src/comp*/**/*.js'],
      rules: {
        semi: ['error', 'always'],
      },
    },
    // Deeply nested pattern
    {
      files: ['src/components/forms/inputs/**/*.{js,jsx}'],
      rules: {
        'jsx-quotes': ['error', 'prefer-double'],
      },
    },
    // Root level pattern
    {
      files: ['*.js'],
      rules: {
        'no-var': ['error'],
      },
    },
    // Pattern with excludedFiles
    {
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: ['src/**/*.test.{ts,tsx}', 'src/**/*.stories.{ts,tsx}'],
      rules: {
        'no-explicit-any': ['error'],
      },
    },
  ],
}));

describe('createRuleOverrides', () => {
  const childConfigDir = '/project/src/components';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN childConfigDir is not provided', () => {
    it('SHOULD throw an error', () => {
      expect(() => {
        createRuleOverrides({
          rules: {
            'no-restricted-imports': ['lodash'],
          },
        });
      }).toThrow('No childConfigDir provided');
    });
  });

  describe('WHEN rules are not provided', () => {
    describe('AND WHEN rules is an empty object', () => {
      it('SHOULD throw an error', () => {
        expect(() => {
          createRuleOverrides({
            childConfigDir,
            rules: {},
          });
        }).toThrow('No rules provided');
      });
    });

    describe('AND WHEN rules is missing', () => {
      it('SHOULD throw an error', () => {
        expect(() => {
          createRuleOverrides({
            childConfigDir,
          });
        }).toThrow('No rules provided');
      });
    });
  });

  describe('WHEN using rule handlers', () => {
    describe('AND WHEN using the built-in no-restricted-imports handler', () => {
      it('SHOULD use the built-in handler and transform patterns correctly', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-restricted-imports': {
              strategy: 'merge',
              value: ['axios'],
              severity: 'error',
            },
          },
        });

        // Should include overrides that have no-restricted-imports and apply to our directory
        expect(result).toHaveLength(3);

        // First override: src/components/**/*.{js,jsx,ts,tsx} -> **/*.{js,jsx,ts,tsx}
        expect(result[0].files).toEqual(['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']);
        expect(result[0].rules['no-restricted-imports'][0]).toBe('error');
        expect(result[0].rules['no-restricted-imports'][1].paths).toContain('axios');
        expect(result[0].rules['no-restricted-imports'][1].paths).toContain('lodash');

        // Second override: src/**/components/**/*.js -> **/*.js
        expect(result[1].files).toEqual(['**/*.js']);
        expect(result[1].rules['no-restricted-imports'][1].paths).toContain('axios');
        expect(result[1].rules['no-restricted-imports'][1].paths).toContain('moment');

        // Third override: src/**/*.js, !src/**/*.test.js -> **/*.js, !**/*.test.js
        expect(result[2].files).toEqual(['**/*.js', '!**/*.test.js']);
        expect(result[2].excludedFiles).toEqual(['**/*.mock.js']);
        expect(result[2].rules['no-restricted-imports'][0]).toBe('error'); // Changed from warn
        expect(result[2].rules['no-restricted-imports'][1].paths).toContain('axios');
        expect(result[2].rules['no-restricted-imports'][1].paths).toContain('react-router');
      });
    });

    describe('AND WHEN no specific handler exists', () => {
      it('SHOULD throw an error for merge strategy without handler', () => {
        expect(() => {
          createRuleOverrides({
            childConfigDir,
            rules: {
              'no-console': {
                strategy: 'merge',
                value: ['error', { allow: ['warn'] }],
              },
            },
          });
        }).toThrow(/Strategy 'merge' requires a custom handler/);
      });

      it('SHOULD work for replace strategy', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': {
              strategy: 'replace',
              value: ['error', { allow: ['warn', 'error'] }],
            },
          },
        });

        expect(result).toHaveLength(1);
        expect(result[0].files).toEqual(['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']);
        expect(result[0].rules['no-console']).toEqual(['error', { allow: ['warn', 'error'] }]);
      });

      it('SHOULD work for remove strategy', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': {
              strategy: 'remove',
            },
          },
        });

        expect(result).toHaveLength(1);
        expect(result[0].files).toEqual(['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']);
        expect(result[0].rules['no-console']).toBeUndefined();
        expect(result[0].rules['no-restricted-imports']).toBeDefined(); // Other rules remain
      });

      it('SHOULD work for severity-only changes', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': {
              severity: 'error',
            },
          },
        });

        expect(result).toHaveLength(1);
        expect(result[0].files).toEqual(['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']);
        expect(result[0].rules['no-console'][0]).toBe(2); // error = 2
        expect(result[0].rules['no-console'][1]).toEqual({ allow: ['error'] }); // Options preserved
      });
    });

    describe('AND WHEN a custom handler is provided', () => {
      it('SHOULD use the custom handler', () => {
        const customHandler = {
          process: jest.fn((config, ruleConfig, context) => {
            // Custom logic to modify config
            if (config.overrides) {
              for (const override of config.overrides) {
                if (override.rules && override.rules.complexity) {
                  override.rules.complexity = ['error', { max: 5 }];
                }
              }
            }
          }),
        };

        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            complexity: {
              strategy: 'merge',
              value: { max: 5 },
              customHandler,
            },
          },
        });

        expect(customHandler.process).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].rules.complexity).toEqual(['error', { max: 5 }]);
      });
    });
  });

  describe('WHEN filtering overrides', () => {
    describe('AND WHEN only some overrides have processed rules', () => {
      it('SHOULD only include overrides with processed rules', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': {
              strategy: 'replace',
              value: ['error'],
            },
          },
        });

        // Should only include overrides that have no-console rule
        expect(result).toHaveLength(1);
        expect(result[0].rules['no-console']).toEqual(['error']);
      });
    });

    describe('AND WHEN multiple rules are configured', () => {
      it('SHOULD handle filtering for multiple rules', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': { strategy: 'replace', value: ['error'] },
            'no-debugger': { strategy: 'remove' },
          },
        });

        // Should include overrides with either rule
        const hasNoConsole = result.some((o) => 'no-console' in o.rules);
        const hasNoDebugger = result.some((o) => !('no-debugger' in o.rules)); // Removed

        expect(hasNoConsole).toBe(true);
        expect(hasNoDebugger).toBe(true);
      });
    });

    describe('AND WHEN patterns use brace expansion', () => {
      it('SHOULD expand braces and transform patterns correctly', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-restricted-imports': {
              severity: 'error',
            },
          },
        });

        // First override with brace expansion should be expanded
        const firstOverride = result.find(
          (o) => o.files.includes('**/*.jsx') && o.files.includes('**/*.tsx')
        );
        expect(firstOverride).toBeDefined();
        expect(firstOverride.files).toEqual(['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']);
      });
    });

    describe('AND WHEN patterns have excludedFiles', () => {
      it('SHOULD transform excludedFiles patterns correctly', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-explicit-any': {
              severity: 'warn',
            },
          },
        });

        const overrideWithExcluded = result.find((o) => o.excludedFiles);
        expect(overrideWithExcluded).toBeDefined();
        expect(overrideWithExcluded.excludedFiles).toEqual([
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.stories.ts',
          '**/*.stories.tsx',
        ]);
      });
    });
  });

  describe('WHEN handling edge cases', () => {
    describe('AND WHEN root config has no overrides', () => {
      it('SHOULD return empty array', () => {
        const eslintConfig = require('../../../.eslintrc');
        const originalOverrides = eslintConfig.overrides;
        eslintConfig.overrides = [];

        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': {
              strategy: 'replace',
              value: ['error'],
            },
          },
        });

        expect(result).toEqual([]);

        // Restore
        eslintConfig.overrides = originalOverrides;
      });
    });

    describe('AND WHEN root config has undefined overrides', () => {
      it('SHOULD return empty array', () => {
        const eslintConfig = require('../../../.eslintrc');
        const originalOverrides = eslintConfig.overrides;
        delete eslintConfig.overrides;

        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': {
              strategy: 'replace',
              value: ['error'],
            },
          },
        });

        expect(result).toEqual([]);

        // Restore
        eslintConfig.overrides = originalOverrides;
      });
    });

    describe('AND WHEN working with exact file patterns', () => {
      it('SHOULD handle exact file matches correctly', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'specific-rule': {
              severity: 'warn',
            },
          },
        });

        const exactMatch = result.find((o) => o.rules['specific-rule']);
        expect(exactMatch).toBeDefined();
        expect(exactMatch.files).toEqual(['Button.js']);
      });
    });

    describe('AND WHEN working with wildcard patterns', () => {
      it('SHOULD handle wildcard patterns correctly', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-default-export': {
              severity: 'error',
            },
          },
        });

        const wildcardMatch = result.find((o) => o.rules['no-default-export']);
        expect(wildcardMatch).toBeDefined();
        // src/*/index.js becomes index.js when in src/components
        // src/**/*/index.ts becomes */index.ts
        expect(wildcardMatch.files).toContain('*/index.ts');
      });
    });

    describe('AND WHEN working with deeply nested patterns', () => {
      it('SHOULD handle deeply nested patterns correctly', () => {
        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'jsx-quotes': {
              strategy: 'replace',
              value: ['error', 'prefer-single'],
            },
          },
        });

        const nestedMatch = result.find((o) => o.rules['jsx-quotes']);
        expect(nestedMatch).toBeDefined();
        expect(nestedMatch.files).toEqual(['forms/inputs/**/*.js', 'forms/inputs/**/*.jsx']);
        expect(nestedMatch.rules['jsx-quotes']).toEqual(['error', 'prefer-single']);
      });
    });
  });
});

describe('normalizeRuleConfig', () => {
  describe('WHEN given severity-only config', () => {
    it('SHOULD normalize to config object with severity', () => {
      const result = normalizeRuleConfig({ severity: 'error' });
      expect(result).toEqual({
        strategy: undefined,
        value: undefined,
        severity: 'error',
        customHandler: undefined,
      });
    });
  });

  describe('WHEN given simple value', () => {
    it('SHOULD throw an error', () => {
      expect(() => normalizeRuleConfig(['lodash', 'moment'])).toThrow(
        "Invalid rule configuration object. Expected properties: 'strategy', 'value', 'severity', or 'customHandler'. Got: [\"0\",\"1\"]. Use { severity: 'error' } to change severity, { strategy: 'replace', value: [...] } to replace, { strategy: 'merge', value: [...] } to merge (requires handler), or { strategy: 'remove' } to remove."
      );
    });
  });

  describe('WHEN given explicit config', () => {
    it('SHOULD preserve the explicit configuration', () => {
      const config = {
        strategy: 'replace',
        value: ['error'],
        severity: 'warn',
      };
      const result = normalizeRuleConfig(config);
      expect(result).toEqual({
        strategy: 'replace',
        value: ['error'],
        severity: 'warn',
        customHandler: undefined,
      });
    });
  });

  describe('WHEN given value without strategy in config', () => {
    it('SHOULD error', () => {
      expect(() => normalizeRuleConfig({ value: ['error'] })).toThrow(
        "'value' property requires a 'strategy' property. Specify how to apply the value: 'replace', 'merge' (requires handler), etc."
      );
    });
  });

  describe('WHEN given strategy without value in config', () => {
    it('SHOULD error', () => {
      expect(() => normalizeRuleConfig({ strategy: 'replace' })).toThrow(
        "Strategy 'replace' requires a 'value' property. Only 'remove' strategy can be used without a value."
      );
    });
  });

  describe('WHEN given config with custom handler', () => {
    it('SHOULD preserve custom handler', () => {
      const handler = { process: jest.fn() };
      const result = normalizeRuleConfig({
        strategy: 'merge',
        value: ['error'],
        customHandler: handler,
      });
      expect(result.customHandler).toBe(handler);
    });
  });
});

describe('normalizeSeverity', () => {
  describe('WHEN given string severities', () => {
    it('SHOULD normalize to numeric values', () => {
      expect(normalizeSeverity('off')).toBe(0);
      expect(normalizeSeverity('warn')).toBe(1);
      expect(normalizeSeverity('error')).toBe(2);
    });
  });

  describe('WHEN given numeric severities', () => {
    it('SHOULD return the same numeric values', () => {
      expect(normalizeSeverity(0)).toBe(0);
      expect(normalizeSeverity(1)).toBe(1);
      expect(normalizeSeverity(2)).toBe(2);
    });
  });

  describe('WHEN given invalid severities', () => {
    it('SHOULD return null', () => {
      expect(normalizeSeverity('invalid')).toBe(null);
      expect(normalizeSeverity(3)).toBe(null);
      expect(normalizeSeverity(undefined)).toBe(null);
      expect(normalizeSeverity(null)).toBe(null);
    });
  });
});

describe('applyDefaultHandler', () => {
  let config;

  beforeEach(() => {
    config = {
      overrides: [
        {
          files: ['**/*.js'],
          rules: {
            'no-console': ['warn', { allow: ['error'] }],
            'no-debugger': ['error'],
          },
        },
      ],
    };
  });

  describe('WHEN using remove strategy', () => {
    it('SHOULD remove the rule from config', () => {
      applyDefaultHandler(config, 'no-console', { strategy: 'remove' });
      expect(config.overrides[0].rules['no-console']).toBeUndefined();
      expect(config.overrides[0].rules['no-debugger']).toEqual(['error']);
    });
  });

  describe('WHEN using replace strategy', () => {
    describe('AND WHEN rule exists', () => {
      it('SHOULD replace existing rule', () => {
        applyDefaultHandler(config, 'no-console', {
          strategy: 'replace',
          value: ['error', { allow: ['warn', 'error'] }],
        });
        expect(config.overrides[0].rules['no-console']).toEqual([
          'error',
          { allow: ['warn', 'error'] },
        ]);
      });
    });

    describe('AND WHEN rule does not exist', () => {
      it('SHOULD not add the rule', () => {
        applyDefaultHandler(config, 'new-rule', {
          strategy: 'replace',
          value: ['error'],
        });
        expect(config.overrides[0].rules['new-rule']).toBeUndefined();
      });
    });
  });

  describe('WHEN applying severity-only changes', () => {
    describe('AND WHEN severity is valid', () => {
      it('SHOULD update rule severity', () => {
        applyDefaultHandler(config, 'no-console', {
          severity: 'error',
        });
        expect(config.overrides[0].rules['no-console'][0]).toBe(2);
      });
    });

    describe('AND WHEN severity is invalid', () => {
      it('SHOULD throw error', () => {
        expect(() => {
          applyDefaultHandler(config, 'no-console', {
            severity: 'invalid',
          });
        }).toThrow("Invalid severity 'invalid' for rule 'no-console'");
      });
    });

    describe('AND WHEN rule has string severity', () => {
      it('SHOULD update string rule severity', () => {
        config.overrides[0].rules['simple-rule'] = 'warn';
        applyDefaultHandler(config, 'simple-rule', {
          severity: 'error',
        });
        expect(config.overrides[0].rules['simple-rule']).toBe(2);
      });
    });
  });

  describe('WHEN using strategies requiring custom handlers', () => {
    describe('AND WHEN using merge strategy without handler', () => {
      it('SHOULD throw error', () => {
        expect(() => {
          applyDefaultHandler(config, 'no-console', {
            strategy: 'merge',
            value: { allow: ['log'] },
          });
        }).toThrow(/Strategy 'merge' requires a custom handler for rule 'no-console'/);
      });
    });
  });
});
