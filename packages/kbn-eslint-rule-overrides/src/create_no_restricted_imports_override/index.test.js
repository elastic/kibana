/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { createNoRestrictedImportsOverride } = require('.');
const eslintConfig = require('../../../../.eslintrc');

const {
  transformOverridesForNestedContext,
} = require('../utils/transform_overrides_for_nested_context');
const { mergeRestrictedImports } = require('./utils/merge_restricted_imports');

jest.mock('../utils/transform_overrides_for_nested_context', () => ({
  transformOverridesForNestedContext: jest.fn(),
}));

jest.mock('./utils/merge_restricted_imports', () => ({
  mergeRestrictedImports: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((...args) => {
    if (args.length === 5 && args.slice(1).join('/') === '../../../..') {
      return '/project';
    }

    return jest.requireActual('path').resolve(...args);
  }),
}));

jest.mock('../../../../.eslintrc', () => ({
  overrides: [
    {
      files: ['src/**/*.js'],
      rules: {
        'no-restricted-imports': ['error', { paths: ['lodash'], patterns: [] }],
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

describe('createNoRestrictedImportsOverride', () => {
  const childConfigDir = '/project/src/components';
  const restrictedImports = ['react-router', 'moment'];

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
        createNoRestrictedImportsOverride({
          restrictedImports,
        });
      }).toThrow('No childConfigDir provided');
    });
  });

  describe('when restrictedImports are not provided', () => {
    it('should throw an error', () => {
      expect(() => {
        createNoRestrictedImportsOverride({
          childConfigDir,
          restrictedImports: [],
        });
      }).toThrow('No restricted imports provided');
    });
  });

  describe('when params are valid', () => {
    it('should call mergeRestrictedImports with cloned config and restricted imports', () => {
      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports,
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(
        expect.objectContaining({
          overrides: expect.arrayContaining([
            expect.objectContaining({
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': ['error', { paths: ['lodash'], patterns: [] }],
              },
            }),
          ]),
        }),
        restrictedImports
      );
    });

    it('should call transformOverridesForNestedContext with correct parameters', () => {
      const rootDir = require('path').resolve(__dirname, '..', '..', '..', '..');

      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports,
      });

      expect(transformOverridesForNestedContext).toHaveBeenCalledWith(
        [
          {
            files: ['src/**/*.js'],
            rules: {
              'no-restricted-imports': ['error', { paths: ['lodash'], patterns: [] }],
            },
          },
          {
            files: ['packages/**/*.ts'],
            rules: {
              'other-rule': ['error'],
            },
          },
        ],
        rootDir,
        childConfigDir,
        expect.any(Function)
      );
    });

    it('should filter overrides using no-restricted-imports rule filter', () => {
      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports,
      });

      const ruleFilter = transformOverridesForNestedContext.mock.calls[0][3];

      // Test the rule filter function
      expect(
        ruleFilter({
          rules: { 'no-restricted-imports': ['error'] },
        })
      ).toBe(true);

      expect(
        ruleFilter({
          rules: { 'other-rule': ['error'] },
        })
      ).toBe(false);

      expect(
        ruleFilter({
          rules: {},
        })
      ).toBe(false);
    });

    it('should return transformed overrides from transformOverridesForNestedContext', () => {
      const mockResult = [
        {
          files: ['**/*.js'],
          rules: {
            'no-restricted-imports': ['error', { paths: ['lodash', 'react-router'], patterns: [] }],
          },
        },
      ];

      transformOverridesForNestedContext.mockReturnValue(mockResult);

      const result = createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports,
      });

      expect(result).toBe(mockResult);
    });
  });

  describe('when handling different restricted import types', () => {
    it('should handle string restrictions', () => {
      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: ['react-router'],
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(expect.any(Object), ['react-router']);
    });

    it('should handle object restrictions', () => {
      const objectRestrictions = [{ name: 'react-router', message: 'Use @kbn/router instead' }];

      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: objectRestrictions,
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(expect.any(Object), objectRestrictions);
    });

    it('should handle mixed restrictions', () => {
      const mixedRestrictions = ['react-router', { name: 'lodash', message: 'Use native methods' }];

      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports: mixedRestrictions,
      });

      expect(mergeRestrictedImports).toHaveBeenCalledWith(expect.any(Object), mixedRestrictions);
    });
  });

  describe('when handling config cloning', () => {
    it('should not mutate the original root config', () => {
      const originalConfig = require('../../../../.eslintrc');
      const originalOverrides = [...originalConfig.overrides];

      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports,
      });

      expect(originalConfig.overrides).toEqual(originalOverrides);
    });

    it('should pass a deep clone to mergeRestrictedImports', () => {
      createNoRestrictedImportsOverride({
        childConfigDir,
        restrictedImports,
      });

      const passedConfig = mergeRestrictedImports.mock.calls[0][0];
      const originalConfig = require('../../../../.eslintrc');

      expect(passedConfig).toEqual(originalConfig);
      expect(passedConfig).not.toBe(originalConfig);
      expect(passedConfig.overrides).not.toBe(originalConfig.overrides);
    });
  });

  describe('edge cases', () => {
    describe('when root config has no overrides', () => {
      it('should handle root config with empty overrides array', () => {
        eslintConfig.overrides = [];

        const result = createNoRestrictedImportsOverride({
          childConfigDir,
          restrictedImports,
        });

        expect(result).toEqual([]);
        expect(transformOverridesForNestedContext).not.toHaveBeenCalled();
      });
    });

    describe('when root config is empty', () => {
      it('should return []', () => {
        delete eslintConfig.overrides;

        const result = createNoRestrictedImportsOverride({
          childConfigDir,
          restrictedImports,
        });

        expect(result).toEqual([]);
        expect(transformOverridesForNestedContext).not.toHaveBeenCalled();
      });
    });

    describe('when transformOverridesForNestedContext returns no matching overrides', () => {
      it('should return []', () => {
        transformOverridesForNestedContext.mockReturnValue([]);

        const result = createNoRestrictedImportsOverride({
          childConfigDir,
          restrictedImports,
        });

        expect(result).toEqual([]);
      });
    });
  });
});
