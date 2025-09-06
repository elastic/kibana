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
const {
  transformOverridesForNestedContext,
} = require('./utils/transform_overrides_for_nested_context');
const { getRuleHandler } = require('./rule_handlers');

jest.mock('./utils/transform_overrides_for_nested_context', () => ({
  transformOverridesForNestedContext: jest.fn(),
}));

jest.mock('./rule_handlers', () => ({
  getRuleHandler: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((...args) => {
    if (args.length === 4 && args.slice(1).join('/') === '../../..') {
      return '/project';
    }
    return jest.requireActual('path').resolve(...args);
  }),
}));

jest.mock('../../../.eslintrc', () => ({
  overrides: [
    {
      files: ['src/**/*.js'],
      rules: {
        'no-restricted-imports': ['error', { paths: ['lodash'], patterns: [] }],
        'no-console': ['warn'],
      },
    },
    {
      files: ['packages/**/*.ts'],
      rules: {
        'other-rule': ['error'],
      },
    },
  ],
}));

describe('createRuleOverrides', () => {
  const childConfigDir = '/project/src/components';

  beforeEach(() => {
    jest.clearAllMocks();
    transformOverridesForNestedContext.mockReturnValue([
      {
        files: ['**/*.js'],
        rules: {
          'no-restricted-imports': ['error', { paths: ['lodash', 'react-router'], patterns: [] }],
        },
      },
    ]);
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
    describe('AND WHEN a specific handler is available', () => {
      it('SHOULD use the specific handler', () => {
        const mockHandler = {
          process: jest.fn(),
        };
        getRuleHandler.mockReturnValue(mockHandler);

        createRuleOverrides({
          childConfigDir,
          rules: {
            'no-restricted-imports': {
              strategy: 'merge',
              value: ['lodash'],
            },
          },
        });

        expect(getRuleHandler).toHaveBeenCalledWith('no-restricted-imports');
        expect(mockHandler.process).toHaveBeenCalledWith(
          {
            overrides: [
              {
                files: ['src/**/*.js'],
                rules: {
                  'no-restricted-imports': ['error', { paths: ['lodash'], patterns: [] }],
                  'no-console': ['warn'],
                },
              },
              {
                files: ['packages/**/*.ts'],
                rules: {
                  'other-rule': ['error'],
                },
              },
            ],
          },
          { strategy: 'merge', value: ['lodash'], severity: undefined },
          {
            rootDir: '/project',
            childConfigDir,
            ruleName: 'no-restricted-imports',
          }
        );
      });
    });

    describe('AND WHEN no specific handler exists', () => {
      it('SHOULD throw an error for merge strategy without handler', () => {
        getRuleHandler.mockReturnValue(null);

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
    });

    describe('AND WHEN a custom handler is provided', () => {
      it('SHOULD use the custom handler', () => {
        const customHandler = {
          process: jest.fn(),
        };

        createRuleOverrides({
          childConfigDir,
          rules: {
            'custom-rule': {
              strategy: 'merge',
              value: ['error'],
              customHandler,
            },
          },
        });

        expect(customHandler.process).toHaveBeenCalled();
        expect(getRuleHandler).not.toHaveBeenCalledWith('custom-rule');
      });
    });
  });

  describe('WHEN filtering overrides', () => {
    describe('AND WHEN only some overrides have processed rules', () => {
      it('SHOULD only include overrides with processed rules', () => {
        getRuleHandler.mockReturnValue(null);

        createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': {
              strategy: 'replace',
              value: ['error'],
            },
          },
        });

        const ruleFilter = transformOverridesForNestedContext.mock.calls[0][3];

        expect(ruleFilter({ rules: { 'no-console': ['error'] } })).toBe(true);
        expect(ruleFilter({ rules: { 'other-rule': ['error'] } })).toBe(false);
        expect(ruleFilter({ rules: {} })).toBe(false);
        expect(ruleFilter({})).toBe(false);
      });
    });

    describe('AND WHEN multiple rules are configured', () => {
      it('SHOULD handle filtering for multiple rules', () => {
        getRuleHandler.mockReturnValue(null);

        createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': { strategy: 'replace', value: ['error'] },
            'no-debugger': { strategy: 'remove' },
          },
        });

        const ruleFilter = transformOverridesForNestedContext.mock.calls[0][3];

        expect(ruleFilter({ rules: { 'no-console': ['error'] } })).toBe(true);
        expect(ruleFilter({ rules: { 'no-debugger': ['error'] } })).toBe(true);
        expect(ruleFilter({ rules: { 'no-console': ['error'], 'no-debugger': ['error'] } })).toBe(
          true
        );
        expect(ruleFilter({ rules: { 'other-rule': ['error'] } })).toBe(false);
      });
    });
  });

  describe('WHEN handling edge cases', () => {
    describe('AND WHEN root config has no overrides', () => {
      it('SHOULD return empty array', () => {
        const eslintConfig = require('../../../.eslintrc');
        eslintConfig.overrides = [];

        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': ['error'],
          },
        });

        expect(result).toEqual([]);
      });
    });

    describe('AND WHEN root config has undefined overrides', () => {
      it('SHOULD return empty array', () => {
        const eslintConfig = require('../../../.eslintrc');
        delete eslintConfig.overrides;

        const result = createRuleOverrides({
          childConfigDir,
          rules: {
            'no-console': ['error'],
          },
        });

        expect(result).toEqual([]);
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
