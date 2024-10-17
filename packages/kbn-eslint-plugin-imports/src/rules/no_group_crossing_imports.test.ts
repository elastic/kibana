/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import dedent from 'dedent';
import { NoGroupCrossingImportsRule } from './no_group_crossing_imports';
import { formatSuggestions } from '../helpers/report';
import { ModuleGroup, ModuleVisibility } from '@kbn/repo-info/types';

const make = (
  fromGroup: ModuleGroup,
  fromVisibility: ModuleVisibility,
  toGroup: ModuleGroup,
  toVisibility: ModuleVisibility,
  imp = 'import'
) => ({
  filename: `${fromGroup}.${fromVisibility}.ts`,
  code: dedent`
    ${imp} '${toGroup}.${toVisibility}'
  `,
});

jest.mock('../get_import_resolver', () => {
  return {
    getImportResolver() {
      return {
        resolve(req: string) {
          return {
            type: 'file',
            absolute: req.split('.'),
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
        classify(r: string | [string, string]) {
          const [group, visibility] =
            typeof r === 'string' ? (r.endsWith('.ts') ? r.slice(0, -3) : r).split('.') : r;
          return {
            pkgInfo: {
              pkgId: 'aPackage',
            },
            group,
            visibility,
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
    tester.run('@kbn/imports/no_group_crossing_imports', NoGroupCrossingImportsRule, {
      valid: [
        make('observability', 'private', 'observability', 'private'),
        make('security', 'private', 'security', 'private'),
        make('search', 'private', 'search', 'private'),
        make('observability', 'private', 'platform', 'shared'),
        make('security', 'private', 'common', 'shared'),
        make('platform', 'shared', 'platform', 'shared'),
        make('platform', 'shared', 'platform', 'private'),
        make('common', 'shared', 'common', 'shared'),
      ],

      invalid: [
        {
          ...make('observability', 'private', 'security', 'private'),
          errors: [
            {
              line: 1,
              messageId: 'ILLEGAL_IMPORT',
              data: {
                importerPackage: 'aPackage',
                importerGroup: 'observability',
                importedPackage: 'aPackage',
                importedGroup: 'security',
                importedVisibility: 'private',
                sourcePath: 'observability.private.ts',
                suggestion: formatSuggestions([
                  `Please review the dependencies in your module's manifest (kibana.jsonc).`,
                  `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
                  `Address the conflicting dependencies by refactoring the code`,
                ]),
              },
            },
          ],
        },
        {
          ...make('security', 'private', 'platform', 'private'),
          errors: [
            {
              line: 1,
              messageId: 'ILLEGAL_IMPORT',
              data: {
                importerPackage: 'aPackage',
                importerGroup: 'security',
                importedPackage: 'aPackage',
                importedGroup: 'platform',
                importedVisibility: 'private',
                sourcePath: 'security.private.ts',
                suggestion: formatSuggestions([
                  `Please review the dependencies in your module's manifest (kibana.jsonc).`,
                  `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
                  `Address the conflicting dependencies by refactoring the code`,
                ]),
              },
            },
          ],
        },
      ],
    });
  });
}
