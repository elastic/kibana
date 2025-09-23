/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const noRestrictedImportsHandler = require('.');

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
      it('SHOULD merge imports with existing ones and update severity', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: ['react-router'],
          severity: 'error',
        });

        const rule1 = config.overrides[0].rules['no-restricted-imports'];
        expect(rule1[0]).toBe(2); // error = 2
        expect(rule1[1].paths).toEqual(['lodash', 'moment', 'react-router']);
        expect(rule1[1].patterns).toEqual(['@internal/*']);

        const rule2 = config.overrides[1].rules['no-restricted-imports'];
        expect(rule2[0]).toBe(2); // changed from warn to error
        expect(rule2[1].paths).toEqual(['jquery', 'react-router']);
      });
    });

    describe('AND WHEN severity is not provided', () => {
      it('SHOULD merge imports preserving existing severity', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: ['react-router'],
        });

        const rule1 = config.overrides[0].rules['no-restricted-imports'];
        expect(rule1[0]).toBe('error'); // preserved
        expect(rule1[1].paths).toEqual(['lodash', 'moment', 'react-router']);

        const rule2 = config.overrides[1].rules['no-restricted-imports'];
        expect(rule2[0]).toBe('warn'); // preserved
        expect(rule2[1].paths).toEqual(['jquery', 'react-router']);
      });
    });

    describe('AND WHEN merging object restrictions', () => {
      it('SHOULD merge object restrictions with existing ones', () => {
        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: [
            {
              name: 'axios',
              message: 'Use fetch instead',
            },
            'underscore',
          ],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([
          'lodash',
          'moment',
          {
            name: 'axios',
            message: 'Use fetch instead',
          },
          'underscore',
        ]);
      });
    });

    describe('AND WHEN merging duplicate imports', () => {
      it('SHOULD replace existing imports with new ones', () => {
        config.overrides[0].rules['no-restricted-imports'] = [
          'error',
          {
            paths: [
              'lodash',
              {
                name: 'moment',
                message: 'Old message',
              },
            ],
            patterns: [],
          },
        ];

        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: [
            {
              name: 'lodash',
              message: 'New message',
            },
            'moment', // This replaces the object version
          ],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([
          {
            name: 'lodash',
            message: 'New message',
          },
          'moment',
        ]);
      });
    });

    describe('AND WHEN config has legacy format', () => {
      it('SHOULD handle legacy format and merge correctly', () => {
        config.overrides[0].rules['no-restricted-imports'] = [
          'error',
          'lodash',
          'moment',
          {
            paths: ['jquery'],
            patterns: ['@internal/*'],
          },
        ];

        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: ['react-router'],
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['lodash', 'moment', 'jquery', 'react-router']);
        expect(rule[1].patterns).toEqual(['@internal/*']);
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
        }).toThrow(
          "Unknown strategy 'unknown' for no-restricted-imports rule override. Allowed strategies are only: 'merge', 'replace', and 'remove'."
        );
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

  describe('WHEN testing actual merge functionality', () => {
    describe('AND WHEN merging complex restrictions', () => {
      it('SHOULD correctly merge all types of restrictions', () => {
        config.overrides[0].rules['no-restricted-imports'] = [
          'error',
          {
            paths: [
              'lodash',
              {
                name: 'moment',
                message: 'Use date-fns',
              },
            ],
            patterns: ['@internal/*'],
          },
        ];

        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: [
            'axios',
            {
              name: 'react-router-dom',
              importNames: ['Route', 'Switch'],
              message: 'Use @kbn/shared-ux-router',
            },
            'lodash', // Duplicate - should be replaced
          ],
          severity: 'error',
        });

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[0]).toBe(2);
        expect(rule[1].paths).toHaveLength(4);
        expect(rule[1].paths).toContainEqual({
          name: 'moment',
          message: 'Use date-fns',
        });
        expect(rule[1].paths).toContainEqual({
          name: 'react-router-dom',
          importNames: ['Route', 'Switch'],
          message: 'Use @kbn/shared-ux-router',
        });
        expect(rule[1].paths).toContain('axios');
        expect(rule[1].paths).toContain('lodash');
        expect(rule[1].patterns).toEqual(['@internal/*']);
      });
    });

    describe('AND WHEN working with malformed rules', () => {
      it('SHOULD skip malformed rules during merge', () => {
        config.overrides.push({
          files: ['**/*.ts'],
          rules: {
            'no-restricted-imports': 'error', // Malformed - not an array
          },
        });
        config.overrides.push({
          files: ['**/*.tsx'],
          rules: {
            'no-restricted-imports': ['error'], // Malformed - no options
          },
        });

        noRestrictedImportsHandler.process(config, {
          strategy: 'merge',
          value: ['axios'],
        });

        // Only first two overrides should be processed
        expect(config.overrides[0].rules['no-restricted-imports'][1].paths).toContain('axios');
        expect(config.overrides[1].rules['no-restricted-imports'][1].paths).toContain('axios');

        // Malformed rules should remain unchanged
        expect(config.overrides[2].rules['no-restricted-imports']).toBe('error');
        expect(config.overrides[3].rules['no-restricted-imports']).toEqual(['error']);
      });
    });
  });
});
