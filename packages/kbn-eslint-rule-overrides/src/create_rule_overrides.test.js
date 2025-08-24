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

  describe('when childConfigDir is not provided', () => {
    it('should throw an error', () => {
      expect(() => {
        createRuleOverrides({
          rules: {
            'no-restricted-imports': ['lodash'],
          },
        });
      }).toThrow('No childConfigDir provided');
    });
  });

  describe('when rules are not provided', () => {
    it('should throw an error for empty rules object', () => {
      expect(() => {
        createRuleOverrides({
          childConfigDir,
          rules: {},
        });
      }).toThrow('No rules provided');
    });

    it('should throw an error for missing rules', () => {
      expect(() => {
        createRuleOverrides({
          childConfigDir,
        });
      }).toThrow('No rules provided');
    });
  });

  describe('when using rule handlers', () => {
    it('should use specific handler when available', () => {
      const mockHandler = {
        process: jest.fn(),
      };
      getRuleHandler.mockReturnValue(mockHandler);

      createRuleOverrides({
        childConfigDir,
        rules: {
          'no-restricted-imports': ['lodash'],
        },
      });

      expect(getRuleHandler).toHaveBeenCalledWith('no-restricted-imports');
      expect(mockHandler.process).toHaveBeenCalledWith(
        expect.any(Object),
        { strategy: 'merge', value: ['lodash'], severity: undefined },
        expect.objectContaining({
          rootDir: '/project',
          childConfigDir,
          ruleName: 'no-restricted-imports',
        })
      );
    });

    it('should use default handler when no specific handler exists', () => {
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

    it('should use custom handler when provided', () => {
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

  describe('when filtering overrides', () => {
    it('should only include overrides with processed rules', () => {
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

    it('should handle multiple rules', () => {
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

  describe('edge cases', () => {
    it('should handle root config with no overrides', () => {
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

    it('should handle root config with undefined overrides', () => {
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

describe('normalizeRuleConfig', () => {
  it('should handle severity-only config', () => {
    const result = normalizeRuleConfig({ severity: 'error' });
    expect(result).toEqual({
      strategy: undefined,
      value: undefined,
      severity: 'error',
      customHandler: undefined,
    });
  });

  it('should normalize simple value to merge strategy', () => {
    const result = normalizeRuleConfig(['lodash', 'moment']);
    expect(result).toEqual({
      strategy: 'merge',
      value: ['lodash', 'moment'],
      severity: undefined,
    });
  });

  it('should preserve explicit config', () => {
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

  it('should use defaults for missing fields', () => {
    const result = normalizeRuleConfig({ value: ['error'] });
    expect(result).toEqual({
      strategy: 'merge',
      value: ['error'],
      severity: undefined,
      customHandler: undefined,
    });
  });

  it('should preserve custom handler', () => {
    const handler = { process: jest.fn() };
    const result = normalizeRuleConfig({
      value: ['error'],
      customHandler: handler,
    });
    expect(result.customHandler).toBe(handler);
  });
});

describe('normalizeSeverity', () => {
  it('should normalize string severities', () => {
    expect(normalizeSeverity('off')).toBe(0);
    expect(normalizeSeverity('warn')).toBe(1);
    expect(normalizeSeverity('error')).toBe(2);
  });

  it('should normalize numeric severities', () => {
    expect(normalizeSeverity(0)).toBe(0);
    expect(normalizeSeverity(1)).toBe(1);
    expect(normalizeSeverity(2)).toBe(2);
  });

  it('should return null for invalid severities', () => {
    expect(normalizeSeverity('invalid')).toBe(null);
    expect(normalizeSeverity(3)).toBe(null);
    expect(normalizeSeverity(undefined)).toBe(null);
    expect(normalizeSeverity(null)).toBe(null);
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

  describe('remove strategy', () => {
    it('should remove the rule', () => {
      applyDefaultHandler(config, 'no-console', { strategy: 'remove' });
      expect(config.overrides[0].rules['no-console']).toBeUndefined();
      expect(config.overrides[0].rules['no-debugger']).toEqual(['error']);
    });
  });

  describe('replace strategy', () => {
    it('should replace existing rule', () => {
      applyDefaultHandler(config, 'no-console', {
        strategy: 'replace',
        value: ['error', { allow: ['warn', 'error'] }],
      });
      expect(config.overrides[0].rules['no-console']).toEqual([
        'error',
        { allow: ['warn', 'error'] },
      ]);
    });

    it('should not add rule if it does not exist', () => {
      applyDefaultHandler(config, 'new-rule', {
        strategy: 'replace',
        value: ['error'],
      });
      expect(config.overrides[0].rules['new-rule']).toBeUndefined();
    });
  });

  describe('severity-only changes', () => {
    it('should update severity when only severity is provided', () => {
      applyDefaultHandler(config, 'no-console', {
        severity: 'error',
      });
      expect(config.overrides[0].rules['no-console'][0]).toBe(2);
    });

    it('should throw for invalid severity', () => {
      expect(() => {
        applyDefaultHandler(config, 'no-console', {
          severity: 'invalid',
        });
      }).toThrow("Invalid severity 'invalid' for rule 'no-console'");
    });

    it('should handle string rule severity update', () => {
      config.overrides[0].rules['simple-rule'] = 'warn';
      applyDefaultHandler(config, 'simple-rule', {
        severity: 'error',
      });
      expect(config.overrides[0].rules['simple-rule']).toBe(2);
    });
  });

  describe('merge/append/prepend strategies', () => {
    it('should throw error for merge strategy without custom handler', () => {
      expect(() => {
        applyDefaultHandler(config, 'no-console', {
          strategy: 'merge',
          value: { allow: ['log'] },
        });
      }).toThrow(/Strategy 'merge' requires a custom handler for rule 'no-console'/);
    });

    it('should throw error for append strategy without custom handler', () => {
      expect(() => {
        applyDefaultHandler(config, 'no-console', {
          strategy: 'append',
          value: ['error'],
        });
      }).toThrow(/Strategy 'append' requires a custom handler/);
    });

    it('should throw error for prepend strategy without custom handler', () => {
      expect(() => {
        applyDefaultHandler(config, 'no-console', {
          strategy: 'prepend',
          value: ['error'],
        });
      }).toThrow(/Strategy 'prepend' requires a custom handler/);
    });
  });
});
