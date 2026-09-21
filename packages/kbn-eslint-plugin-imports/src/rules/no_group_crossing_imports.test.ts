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
import type { ModuleGroup, ModuleVisibility } from '@kbn/projects-solutions-groups';
import type { KibanaPackageManifest } from '@kbn/repo-packages';

type EncodedModuleType = 'tests-or-mocks' | 'tooling' | 'common-package';

interface ModuleInfo {
  group: ModuleGroup;
  visibility: ModuleVisibility;
  type?: KibanaPackageManifest['type'];
  devOnly?: boolean;
  moduleType?: EncodedModuleType;
}

const encode = ({
  group,
  visibility,
  type = 'shared-common',
  devOnly = false,
  moduleType,
}: ModuleInfo): string => {
  const id = `${group}.${visibility}.${type}.${devOnly}`;
  return moduleType ? `${id}.${moduleType}` : id;
};

const make = (from: ModuleInfo, to: ModuleInfo, imp = 'import') => ({
  filename: `${encode(from)}.ts`,
  code: dedent`
    ${imp} '${encode(to)}'
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
  const moduleTypes: Record<string, string> = {
    'common-package': 'common package',
    'tests-or-mocks': 'tests or mocks',
    tooling: 'tooling',
  };
  return {
    getRepoSourceClassifier() {
      return {
        classify(r: string | string[]) {
          const [group, visibility, type, devOnly, moduleType] =
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
            type: moduleTypes[moduleType] ?? 'common package',
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
        make(
          { group: 'platform', visibility: 'shared', devOnly: true },
          { group: 'platform', visibility: 'shared', devOnly: true }
        ),
        make(
          {
            group: 'platform',
            visibility: 'shared',
            moduleType: 'tests-or-mocks',
          },
          { group: 'platform', visibility: 'shared', devOnly: true }
        ),
        make(
          { group: 'platform', visibility: 'shared', moduleType: 'tooling' },
          { group: 'platform', visibility: 'shared', devOnly: true }
        ),
        {
          filename: `${encode({ group: 'platform', visibility: 'shared' })}.ts`,
          code: `import type { Foo } from '${encode({
            group: 'platform',
            visibility: 'shared',
            devOnly: true,
          })}'`,
        },
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
        {
          ...make(
            { group: 'platform', visibility: 'shared' },
            { group: 'platform', visibility: 'shared', devOnly: true }
          ),
          errors: [
            {
              line: 1,
              messageId: 'DEV_ONLY_IMPORT',
              data: {
                importerPackage: 'aPackage',
                importedPackage: 'aPackage',
                sourcePath: 'platform.shared.shared-common.false.ts',
                suggestion: formatSuggestions([
                  'A devOnly package can only be imported by other devOnly packages, tests, or tooling.',
                  'If this file is a test or tool, name or place it so it is classified as such (`.test.ts`, `mocks/`, `scripts/`).',
                  'If this package itself should not ship, set `"devOnly": true` in its kibana.jsonc.',
                ]),
              },
            },
          ],
        },
      ],
    });
  });
}
