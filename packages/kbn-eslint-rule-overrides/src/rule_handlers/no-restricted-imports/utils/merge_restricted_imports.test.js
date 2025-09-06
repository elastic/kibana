/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { mergeRestrictedImports } = require('./merge_restricted_imports');

describe('mergeRestrictedImports', () => {
  describe('WHEN merging restricted imports into existing config', () => {
    it('SHOULD merge string restrictions with existing string restrictions', () => {
      const config = {
        overrides: [
          {
            files: ['src/**/*.js'],
            rules: {
              'no-restricted-imports': [
                'error',
                {
                  paths: ['lodash'],
                  patterns: [],
                },
              ],
            },
          },
        ],
      };

      const restrictedImports = ['react-router'];

      mergeRestrictedImports(config, restrictedImports);

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[1].paths).toEqual(['lodash', 'react-router']);
    });

    describe('AND WHEN severity is overridden', () => {
      it('SHOULD merge with the new severity level', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        mergeRestrictedImports(config, ['react-router'], 1); // Change to warn

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[0]).toBe(1);
        expect(rule[1].paths).toEqual(['lodash', 'react-router']);
      });

      it('SHOULD handle numeric severity values', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  2,
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        mergeRestrictedImports(config, ['react-router'], 0); // Change to off

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[0]).toBe(0);
      });
    });

    describe('AND WHEN no severity override is provided', () => {
      it('SHOULD preserve existing severity', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'warn',
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        mergeRestrictedImports(config, ['react-router']);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[0]).toBe('warn');
      });
    });

    describe('AND WHEN merging object restrictions', () => {
      it('SHOULD merge object restrictions with existing restrictions', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = [
          {
            name: 'react-router',
            message: 'Use @kbn/shared-ux-router instead',
          },
        ];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([
          'lodash',
          {
            name: 'react-router',
            message: 'Use @kbn/shared-ux-router instead',
          },
        ]);
      });

      it('SHOULD merge mixed string and object restrictions', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: [
                      'lodash',
                      {
                        name: 'moment',
                        message: 'Use @kbn/datemath instead',
                      },
                    ],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = [
          'react-router',
          {
            name: 'jquery',
            message: 'Use modern DOM APIs instead',
          },
        ];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([
          'lodash',
          {
            name: 'moment',
            message: 'Use @kbn/datemath instead',
          },
          'react-router',
          {
            name: 'jquery',
            message: 'Use modern DOM APIs instead',
          },
        ]);
      });
    });

    describe('AND WHEN existing config has patterns', () => {
      it('SHOULD preserve existing patterns', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: ['@internal/*'],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].patterns).toEqual(['@internal/*']);
      });
    });

    it('SHOULD preserve rule severity level', () => {
      const config = {
        overrides: [
          {
            files: ['src/**/*.js'],
            rules: {
              'no-restricted-imports': [
                'warn',
                {
                  paths: ['lodash'],
                  patterns: [],
                },
              ],
            },
          },
        ],
      };

      const restrictedImports = ['react-router'];

      mergeRestrictedImports(config, restrictedImports);

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[0]).toBe('warn');
    });
  });

  describe('WHEN handling duplicate restrictions', () => {
    it('SHOULD remove existing string restrictions that match new string restrictions', () => {
      const config = {
        overrides: [
          {
            files: ['src/**/*.js'],
            rules: {
              'no-restricted-imports': [
                'error',
                {
                  paths: ['lodash', 'moment'],
                  patterns: [],
                },
              ],
            },
          },
        ],
      };

      const restrictedImports = ['lodash', 'react-router'];

      mergeRestrictedImports(config, restrictedImports);

      const rule = config.overrides[0].rules['no-restricted-imports'];
      expect(rule[1].paths).toEqual(['moment', 'lodash', 'react-router']);
    });

    describe('AND WHEN existing object restrictions match new string restrictions', () => {
      it('SHOULD remove existing object restrictions', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: [
                      {
                        name: 'lodash',
                        message: 'Old message',
                      },
                      'moment',
                    ],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = ['lodash'];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['moment', 'lodash']);
      });
    });

    describe('AND WHEN existing string restrictions match new object restrictions', () => {
      it('SHOULD remove existing string restrictions', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash', 'moment'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = [
          {
            name: 'lodash',
            message: 'New message',
          },
        ];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([
          'moment',
          {
            name: 'lodash',
            message: 'New message',
          },
        ]);
      });
    });

    describe('AND WHEN existing object restrictions match new object restrictions', () => {
      it('SHOULD remove existing object restrictions and replace with new ones', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: [
                      {
                        name: 'lodash',
                        message: 'Old message',
                      },
                      'moment',
                    ],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = [
          {
            name: 'lodash',
            message: 'New message',
          },
        ];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([
          'moment',
          {
            name: 'lodash',
            message: 'New message',
          },
        ]);
      });
    });

    describe('AND WHEN single non-array import is provided', () => {
      it('SHOULD handle single non-array import', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        mergeRestrictedImports(config, 'react-router');

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['lodash', 'react-router']);
      });
    });
  });

  describe('WHEN handling legacy rule formats', () => {
    describe('AND WHEN rules have mixed string and object options', () => {
      it('SHOULD handle rules with mixed string and object options', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  'lodash',
                  {
                    name: 'moment',
                    message: 'Use @kbn/datemath instead',
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual([
          'lodash',
          {
            name: 'moment',
            message: 'Use @kbn/datemath instead',
          },
          'react-router',
        ]);
      });
    });

    describe('AND WHEN rules have nested paths and patterns objects', () => {
      it('SHOULD handle rules with nested paths and patterns objects', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: ['@internal/*'],
                  },
                  {
                    paths: ['moment'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['lodash', 'moment', 'react-router']);
        expect(rule[1].patterns).toEqual(['@internal/*']);
      });
    });

    describe('AND WHEN rules have mixed legacy formats', () => {
      it('SHOULD normalize mixed legacy formats into modern format', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  'lodash',
                  {
                    name: 'moment',
                    message: 'Use @kbn/datemath instead',
                  },
                  {
                    paths: ['jquery'],
                    patterns: ['@internal/*'],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1]).toMatchObject({
          paths: expect.arrayContaining([
            'lodash',
            {
              name: 'moment',
              message: 'Use @kbn/datemath instead',
            },
            'jquery',
            'react-router',
          ]),
          patterns: ['@internal/*'],
        });
      });
    });

    describe('AND WHEN severity is overridden in legacy format', () => {
      it('SHOULD handle legacy format with severity override', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  'lodash',
                  {
                    paths: ['moment'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        mergeRestrictedImports(config, ['react-router'], 1); // Change to warn

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[0]).toBe(1);
        expect(rule[1].paths).toEqual(['lodash', 'moment', 'react-router']);
      });
    });
  });

  describe('WHEN handling edge cases', () => {
    describe('AND WHEN config has no overrides', () => {
      it('SHOULD handle config with no overrides gracefully', () => {
        const config = {};
        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        expect(config).toEqual({});
      });
    });

    describe('AND WHEN config has empty overrides', () => {
      it('SHOULD handle config with empty overrides gracefully', () => {
        const config = { overrides: [] };
        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        expect(config.overrides).toEqual([]);
      });
    });

    describe('AND WHEN overrides have no no-restricted-imports rules', () => {
      it('SHOULD handle overrides without no-restricted-imports rules gracefully', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'other-rule': ['error'],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        expect(config.overrides[0].rules).toEqual({
          'other-rule': ['error'],
        });
      });
    });

    describe('AND WHEN no-restricted-imports rules are malformed', () => {
      it('SHOULD handle malformed no-restricted-imports rules gracefully', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': ['error'],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        // Should not process malformed rules
        expect(config.overrides[0].rules['no-restricted-imports']).toEqual(['error']);
      });

      it('SHOULD handle rules with only severity', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': ['error'],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        // Should not modify malformed rule
        expect(config.overrides[0].rules['no-restricted-imports']).toEqual(['error']);
      });

      it('SHOULD handle rules that are not arrays', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': 'error',
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        // Should not modify non-array rules
        expect(config.overrides[0].rules['no-restricted-imports']).toBe('error');
      });
    });

    describe('AND WHEN restricted imports array is empty', () => {
      it('SHOULD handle empty restricted imports array gracefully', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = [];

        mergeRestrictedImports(config, restrictedImports);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['lodash']);
      });
    });

    describe('AND WHEN imports are null or undefined', () => {
      it('SHOULD handle null or undefined imports gracefully', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        mergeRestrictedImports(config, null);
        mergeRestrictedImports(config, undefined);

        const rule = config.overrides[0].rules['no-restricted-imports'];
        expect(rule[1].paths).toEqual(['lodash']);
      });
    });

    describe('AND WHEN config has multiple overrides', () => {
      it('SHOULD handle multiple overrides with no-restricted-imports rules', () => {
        const config = {
          overrides: [
            {
              files: ['src/**/*.js'],
              rules: {
                'no-restricted-imports': [
                  'error',
                  {
                    paths: ['lodash'],
                    patterns: [],
                  },
                ],
              },
            },
            {
              files: ['src/**/*.ts'],
              rules: {
                'no-restricted-imports': [
                  'warn',
                  {
                    paths: ['moment'],
                    patterns: [],
                  },
                ],
              },
            },
          ],
        };

        const restrictedImports = ['react-router'];

        mergeRestrictedImports(config, restrictedImports);

        const firstRule = config.overrides[0].rules['no-restricted-imports'];
        const secondRule = config.overrides[1].rules['no-restricted-imports'];

        expect(firstRule[1].paths).toEqual(['lodash', 'react-router']);
        expect(secondRule[1].paths).toEqual(['moment', 'react-router']);
      });

      describe('AND WHEN severity is changed for multiple overrides', () => {
        it('SHOULD handle multiple overrides with severity changes', () => {
          const config = {
            overrides: [
              {
                files: ['src/**/*.js'],
                rules: {
                  'no-restricted-imports': [
                    'error',
                    {
                      paths: ['lodash'],
                      patterns: [],
                    },
                  ],
                },
              },
              {
                files: ['src/**/*.ts'],
                rules: {
                  'no-restricted-imports': [
                    'warn',
                    {
                      paths: ['moment'],
                      patterns: [],
                    },
                  ],
                },
              },
            ],
          };

          mergeRestrictedImports(config, ['react-router'], 2);

          const firstRule = config.overrides[0].rules['no-restricted-imports'];
          const secondRule = config.overrides[1].rules['no-restricted-imports'];

          expect(firstRule[0]).toBe(2);
          expect(firstRule[1].paths).toEqual(['lodash', 'react-router']);

          expect(secondRule[0]).toBe(2);
          expect(secondRule[1].paths).toEqual(['moment', 'react-router']);
        });
      });

      describe('AND WHEN overrides have mixed rule formats', () => {
        it('SHOULD handle overrides with mixed rule formats', () => {
          const config = {
            overrides: [
              {
                files: ['src/**/*.js'],
                rules: {
                  'no-restricted-imports': [
                    'error',
                    {
                      paths: ['lodash'],
                      patterns: [],
                    },
                  ],
                },
              },
              {
                files: ['test/**/*.js'],
                rules: {
                  'no-restricted-imports': ['error'], // Malformed
                },
              },
              {
                files: ['scripts/**/*.js'],
                rules: {
                  'no-restricted-imports': 'off', // Not an array
                },
              },
            ],
          };

          mergeRestrictedImports(config, ['react-router']);

          // Only first override should be modified
          expect(config.overrides[0].rules['no-restricted-imports'][1].paths).toEqual([
            'lodash',
            'react-router',
          ]);
          expect(config.overrides[1].rules['no-restricted-imports']).toEqual(['error']);
          expect(config.overrides[2].rules['no-restricted-imports']).toBe('off');
        });
      });
    });
  });
});
