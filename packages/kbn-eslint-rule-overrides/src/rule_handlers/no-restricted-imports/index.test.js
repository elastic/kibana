/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { mergeRestrictedImports } = require('./utils/merge_restricted_imports');
const noRestrictedImportsHandler = require('.');

jest.mock('./utils/merge_restricted_imports', () => ({
  mergeRestrictedImports: jest.fn(),
}));

describe('noRestrictedImportsHandler', () => {
  let config;

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      overrides: [
        {
          files: ['src/**/*.js'],
          rules: {
            'no-restricted-imports': [
              'error',
              {
                paths: ['lodash', 'moment'],
                patterns: ['@internal/*'],
              },
            ],
          },
        },
        {
          files: ['test/**/*.js'],
          rules: {
            'no-restricted-imports': [
              'warn',
              {
                paths: ['jquery'],
                patterns: [],
              },
            ],
          },
        },
      ],
    };
  });

  describe('merge strategy', () => {
    it('should call mergeRestrictedImports with correct params', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'merge',
        value: ['react-router'],
        severity: 'error',
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(config, ['react-router'], 2);
    });

    it('should handle merge without severity', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'merge',
        value: ['react-router'],
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(config, ['react-router'], null);
    });
  });

  describe('append strategy', () => {
    it('should behave like merge', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'append',
        value: ['react-router'],
        severity: 'warn',
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(config, ['react-router'], 1);
    });
  });

  describe('prepend strategy', () => {
    it('should prepend imports to the beginning', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'prepend',
        value: ['react-router', 'axios'],
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[1].paths).toEqual(['react-router', 'axios', 'lodash', 'moment']);
      expect(rule[1].patterns).toEqual(['@internal/*']);
    });

    it('should remove duplicates when prepending', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'prepend',
        value: ['lodash', 'new-lib'],
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[1].paths).toEqual(['lodash', 'new-lib', 'moment']);
    });

    it('should update severity when provided', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'prepend',
        value: ['react-router'],
        severity: 'warn',
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[0]).toBe(1);
    });
  });

  describe('replace strategy', () => {
    it('should replace entire rule value', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'replace',
        value: ['react-router', 'axios'],
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule).toEqual(['react-router', 'axios']);
    });

    it('should replace with severity update', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'replace',
        value: { paths: ['react-router'], patterns: [] },
        severity: 'warn',
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule).toEqual([1, { paths: ['react-router'], patterns: [] }]);
    });

    it('should handle array value with severity', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'replace',
        value: ['error', { paths: ['new-lib'], patterns: [] }],
        severity: 'off',
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule).toEqual([0, { paths: ['new-lib'], patterns: [] }]);
    });
  });

  describe('remove strategy', () => {
    it('should remove entire rule when value is not provided', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'remove',
      });

      expect(config.overrides[0].rules['no-restricted-imports']).toBeUndefined();
      expect(config.overrides[1].rules['no-restricted-imports']).toBeUndefined();
    });

    it('should remove specific imports when value is provided', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'remove',
        value: ['lodash'],
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[1].paths).toEqual(['moment']);
      expect(rule[1].patterns).toEqual(['@internal/*']);
    });

    it('should remove multiple specific imports', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'remove',
        value: ['lodash', 'moment'],
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[1].paths).toEqual([]);
      expect(rule[1].patterns).toEqual(['@internal/*']);
    });

    it('should handle object imports removal', () => {
      config.overrides[0].rules['no-restricted-imports'] = [
        'error',
        {
          paths: [
            'lodash',
            { name: 'moment', message: 'Use date-fns' },
            { name: 'jquery', message: 'Use native DOM' },
          ],
          patterns: [],
        },
      ];

      noRestrictedImportsHandler.process(config, {
        strategy: 'remove',
        value: [{ name: 'moment' }, 'lodash'],
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[1].paths).toEqual([{ name: 'jquery', message: 'Use native DOM' }]);
    });

    it('should update severity when removing specific imports', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'remove',
        value: ['lodash'],
        severity: 'warn',
      });

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[0]).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should throw error for unknown strategy', () => {
      expect(() => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'unknown',
          value: ['lodash'],
        });
      }).toThrow("Unknown strategy 'unknown' for no-restricted-imports");
    });

    it('should handle empty config overrides', () => {
      const emptyConfig = { overrides: [] };

      expect(() => {
        noRestrictedImportsHandler.process(emptyConfig, {
          strategy: 'merge',
          value: ['lodash'],
        });
      }).not.toThrow();
    });

    it('should handle missing overrides', () => {
      const noOverridesConfig = {};

      expect(() => {
        noRestrictedImportsHandler.process(noOverridesConfig, {
          strategy: 'merge',
          value: ['lodash'],
        });
      }).not.toThrow();
    });
  });
});
