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

  describe('WHEN using merge strategy', () => {
    describe('AND WHEN provided with imports and severity', () => {
      it('SHOULD call mergeRestrictedImports with correct params', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: ['react-router'],
          severity: 'error',
        });

        expect(mergeRestrictedImports).toHaveBeenCalledWith(config, ['react-router'], 2);
      });
    });

    describe('AND WHEN severity is not provided', () => {
      it('SHOULD call mergeRestrictedImports with null severity', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: ['react-router'],
        });

        expect(mergeRestrictedImports).toHaveBeenCalledWith(config, ['react-router'], null);
      });
    });
  });

  describe('WHEN using append strategy', () => {
    it('SHOULD behave like merge strategy', () => {
      noRestrictedImportsHandler.process(config, {
        strategy: 'append',
        value: ['react-router'],
        severity: 'warn',
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(config, ['react-router'], 1);
    });
  });

  describe('WHEN using prepend strategy', () => {
    describe('AND WHEN adding new imports', () => {
      it('SHOULD prepend imports to the beginning of existing paths', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'prepend',
          value: ['react-router', 'axios'],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['react-router', 'axios', 'lodash', 'moment']);
        expect(rule[1].patterns).toEqual(['@internal/*']);
      });
    });

    describe('AND WHEN prepending duplicate imports', () => {
      it('SHOULD remove duplicates while maintaining order', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'prepend',
          value: ['lodash', 'new-lib'],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['lodash', 'new-lib', 'moment']);
      });
    });

    describe('AND WHEN severity is provided', () => {
      it('SHOULD update the rule severity', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'prepend',
          value: ['react-router'],
          severity: 'warn',
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[0]).toBe(1);
      });
    });
  });

  describe('WHEN using replace strategy', () => {
    describe('AND WHEN providing array value without severity', () => {
      it('SHOULD replace entire rule value', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'replace',
          value: ['react-router', 'axios'],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule).toEqual(['react-router', 'axios']);
      });
    });

    describe('AND WHEN providing object value with severity', () => {
      it('SHOULD replace rule with severity format', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'replace',
          value: { paths: ['react-router'], patterns: [] },
          severity: 'warn',
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule).toEqual([1, { paths: ['react-router'], patterns: [] }]);
      });
    });

    describe('AND WHEN providing array value with severity override', () => {
      it('SHOULD replace with updated severity', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'replace',
          value: ['error', { paths: ['new-lib'], patterns: [] }],
          severity: 'off',
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule).toEqual([0, { paths: ['new-lib'], patterns: [] }]);
      });
    });
  });

  describe('WHEN using remove strategy', () => {
    describe('AND WHEN value is not provided', () => {
      it('SHOULD remove entire rule from all overrides', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'remove',
        });

        expect(config.overrides[0].rules['no-restricted-imports']).toBeUndefined();
        expect(config.overrides[1].rules['no-restricted-imports']).toBeUndefined();
      });
    });

    describe('AND WHEN specific imports are provided', () => {
      it('SHOULD remove only specified imports', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'remove',
          value: ['lodash'],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['moment']);
        expect(rule[1].patterns).toEqual(['@internal/*']);
      });
    });

    describe('AND WHEN multiple imports are provided', () => {
      it('SHOULD remove all specified imports', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'remove',
          value: ['lodash', 'moment'],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([]);
        expect(rule[1].patterns).toEqual(['@internal/*']);
      });
    });

    describe('AND WHEN removing object imports', () => {
      it('SHOULD handle complex import objects', () => {
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
    });

    describe('AND WHEN severity is provided with specific imports', () => {
      it('SHOULD update severity while removing imports', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'remove',
          value: ['lodash'],
          severity: 'warn',
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[0]).toBe(1);
      });
    });
  });

  describe('WHEN handling errors', () => {
    describe('AND WHEN unknown strategy is provided', () => {
      it('SHOULD throw descriptive error', () => {
        expect(() => {
          noRestrictedImportsHandler.process(config, {
            strategy: 'unknown',
            value: ['lodash'],
          });
        }).toThrow("Unknown strategy 'unknown' for no-restricted-imports");
      });
    });

    describe('AND WHEN config has empty overrides', () => {
      it('SHOULD not throw error', () => {
        const emptyConfig = { overrides: [] };

        expect(() => {
          noRestrictedImportsHandler.process(emptyConfig, {
            strategy: 'merge',
            value: ['lodash'],
          });
        }).not.toThrow();
      });
    });

    describe('AND WHEN config has no overrides property', () => {
      it('SHOULD not throw error', () => {
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
});
