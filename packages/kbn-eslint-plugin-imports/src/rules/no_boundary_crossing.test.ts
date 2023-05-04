/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleTester } from 'eslint';
import { NoBoundaryCrossingRule } from './no_boundary_crossing';
import { ModuleType } from '@kbn/repo-source-classifier';
import dedent from 'dedent';

const make = (from: ModuleType, to: ModuleType, imp = 'import') => ({
  filename: `${from}.ts`,
  code: dedent`
    ${imp} '${to}'
  `,
});

jest.mock('../get_import_resolver', () => {
  return {
    getImportResolver() {
      return {
        resolve(req: string) {
          return {
            type: 'file',
            absolute: {
              type: req,
            },
          };
        },
      };
    },
  };
});

jest.mock('../helpers/repo_source_classifier', () => {
  return {
    getRepoSourceClassifier() {
      return {
        classify(r: string | { type: string }) {
          return {
            type: typeof r === 'string' ? (r.endsWith('.ts') ? r.slice(0, -3) : r) : r.type,
          };
        },
      };
    },
  };
});

const tsTester = [
  '@typescript-eslint/parser',
  new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      ecmaFeatures: {
        jsx: true,
      },
    },
  }),
] as const;

const babelTester = [
  '@babel/eslint-parser',
  new RuleTester({
    parser: require.resolve('@babel/eslint-parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      requireConfigFile: false,
      babelOptions: {
        presets: ['@kbn/babel-preset/node_preset'],
      },
    },
  }),
] as const;

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/imports/no_boundary_crossing', NoBoundaryCrossingRule, {
      valid: [
        make('common package', 'common package'),
        make('server package', 'common package'),
        make('browser package', 'common package'),
        make('server package', 'server package'),
        make('browser package', 'browser package'),
        make('tests or mocks', 'common package'),
        make('tests or mocks', 'browser package'),
        make('tests or mocks', 'server package'),
        make('tests or mocks', 'tests or mocks'),
        make('browser package', 'server package', 'import type { Foo } from'),
        make('server package', 'browser package', 'import type { Foo } from'),
        make('common package', 'browser package', 'import type { Foo } from'),
      ],

      invalid: [
        {
          ...make('common package', 'server package'),
          errors: [
            {
              line: 1,
              messageId: 'TYPE_MISMATCH',
              data: {
                importedType: 'server package',
                ownType: 'common package',
                suggestion: ` ${dedent`
                  Suggestions:
                   - Remove the import statement.
                   - Limit your imports to "common package" or "static" code.
                   - Covert to a type-only import.
                   - Reach out to #kibana-operations for help.
                `}`,
              },
            },
          ],
        },
        {
          ...make('server package', 'tests or mocks'),
          errors: [
            {
              line: 1,
              messageId: 'TYPE_MISMATCH',
            },
          ],
        },
        {
          ...make('browser package', 'tests or mocks'),
          errors: [
            {
              line: 1,
              messageId: 'TYPE_MISMATCH',
            },
          ],
        },
        {
          ...make('common package', 'server package'),
          errors: [
            {
              line: 1,
              messageId: 'TYPE_MISMATCH',
            },
          ],
        },
        {
          ...make('common package', 'browser package'),
          errors: [
            {
              line: 1,
              messageId: 'TYPE_MISMATCH',
            },
          ],
        },
      ],
    });
  });
}
