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
import type { ModuleGroup, ModuleVisibility } from '@kbn/repo-info/types';
import type { KibanaPackageManifest } from '@kbn/repo-packages';

interface ModuleInfo {
  group: ModuleGroup;
  visibility: ModuleVisibility;
  type?: KibanaPackageManifest['type'];
  devOnly?: boolean;
}

const make = (from: ModuleInfo, to: ModuleInfo, imp = 'import') => ({
  filename: `${from.group}.${from.visibility}.${from.type ?? 'shared-common'}.${
    from.devOnly ?? 'false'
  }.ts`,
  code: dedent`
    ${imp} '${to.group}.${to.visibility}.${to.type ?? 'shared-common'}.${to.devOnly ?? 'false'}'
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
          const [group, visibility, type, devOnly] =
            typeof r === 'string' ? (r.endsWith('.ts') ? r.slice(0, -3) : r).split('.') : r;
          return {
            pkgInfo: {
              pkgId: 'aPackage',
            },
            manifest: {
              type,
              devOnly: devOnly !== 'false',
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
        make(
          { group: 'observability', visibility: 'private' },
          { group: 'observability', visibility: 'private' }
        ),
        make(
          { group: 'security', visibility: 'private' },
          { group: 'security', visibility: 'private' }
        ),
        make(
          { group: 'search', visibility: 'private' },
          { group: 'search', visibility: 'private' }
        ),
        make(
          { group: 'observability', visibility: 'private' },
          { group: 'platform', visibility: 'shared' }
        ),
        make(
          { group: 'security', visibility: 'private' },
          { group: 'common', visibility: 'shared' }
        ),
        make(
          { group: 'platform', visibility: 'shared' },
          { group: 'platform', visibility: 'shared' }
        ),
        make(
          { group: 'platform', visibility: 'shared' },
          { group: 'platform', visibility: 'private' }
        ),
        make(
          { group: 'security', visibility: 'private' },
          { group: 'platform', visibility: 'shared' }
        ),
        make(
          { group: 'common', visibility: 'shared', devOnly: true },
          { group: 'platform', visibility: 'private' }
        ),
        make(
          { group: 'common', visibility: 'shared', type: 'functional-tests' },
          { group: 'platform', visibility: 'private' }
        ),
        make(
          { group: 'common', visibility: 'shared', type: 'test-helper' },
          { group: 'platform', visibility: 'private' }
        ),
        make({ group: 'common', visibility: 'shared' }, { group: 'common', visibility: 'shared' }),
      ],

      invalid: [
        {
          ...make(
            { group: 'observability', visibility: 'private' },
            { group: 'security', visibility: 'private' }
          ),
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
                sourcePath: 'observability.private.shared-common.false.ts',
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
          ...make(
            { group: 'security', visibility: 'private' },
            { group: 'platform', visibility: 'private' }
          ),
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
                sourcePath: 'security.private.shared-common.false.ts',
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
