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
import { rules } from '../..';
import { formatSuggestions } from '../helpers/report';
import type { ModuleGroup, ModuleVisibility } from '@kbn/projects-solutions-groups';
import type { KibanaPackageManifest } from '@kbn/repo-packages';

interface ModuleInfo {
  dir?: string;
  group: ModuleGroup;
  visibility: ModuleVisibility;
  type?: KibanaPackageManifest['type'];
  devOnly?: boolean;
}

const toPath = ({
  dir = '',
  group,
  visibility,
  type = 'shared-common',
  devOnly = false,
}: ModuleInfo) => `${dir}${group}.${visibility}.${type}.${devOnly}`;

const make = (from: ModuleInfo, to: ModuleInfo, imp = 'import') => ({
  filename: `${toPath(from)}.ts`,
  code: dedent`
    ${imp} '${toPath(to)}'
  `,
});

const CORE_PRIVATE: ModuleInfo = {
  dir: 'src/core/packages/foo/server-internal/',
  group: 'platform',
  visibility: 'private',
};

const CORE_PRIVATE_SUGGESTION = formatSuggestions([
  `Import the public Core package instead (@kbn/core-<domain>-server, @kbn/core-<domain>-browser, or @kbn/core-<domain>-common).`,
  `If the public package does not expose what you need, ask @elastic/kibana-core for a public API.`,
]);

jest.mock('../helpers/core_private_importers', () => ({
  CORE_PRIVATE_IMPORTERS: new Set([
    'x-pack/platform/plugins/shared/allowlisted/platform.shared.shared-common.false.ts',
    'x-pack/solutions/security/plugins/allowlisted/security.private.shared-common.false.ts',
  ]),
}));

jest.mock('../get_import_resolver', () => {
  return {
    getImportResolver() {
      return {
        resolve(req: string) {
          return {
            type: 'file',
            absolute: req,
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
        classify(path: string) {
          const [group, visibility, type, devOnly] = path
            .slice(path.lastIndexOf('/') + 1)
            .replace(/\.ts$/, '')
            .split('.');
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
            repoRel: path,
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
    tester.run('@kbn/imports/no_group_crossing_imports', rules.no_group_crossing_imports, {
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
          {
            dir: 'src/core/packages/bar/server-internal/',
            group: 'platform',
            visibility: 'private',
          },
          CORE_PRIVATE
        ),
        make(
          {
            dir: 'x-pack/platform/plugins/shared/allowlisted/',
            group: 'platform',
            visibility: 'shared',
          },
          CORE_PRIVATE
        ),
        make(
          { dir: 'x-pack/platform/plugins/shared/foo/', group: 'platform', visibility: 'shared' },
          { dir: 'src/core/packages/foo/server/', group: 'platform', visibility: 'shared' }
        ),
        make(
          { dir: 'x-pack/platform/plugins/shared/foo/', group: 'platform', visibility: 'shared' },
          { dir: 'src/platform/packages/private/bar/', group: 'platform', visibility: 'private' }
        ),
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
            { dir: 'src/platform/plugins/shared/foo/', group: 'platform', visibility: 'shared' },
            CORE_PRIVATE
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_PRIVATE_IMPORT',
              data: {
                importedPackage: 'aPackage',
                sourcePath:
                  'src/platform/plugins/shared/foo/platform.shared.shared-common.false.ts',
                suggestion: CORE_PRIVATE_SUGGESTION,
              },
            },
          ],
        },
        {
          ...make(
            { dir: 'packages/kbn-foo/', group: 'common', visibility: 'shared', devOnly: true },
            CORE_PRIVATE
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_PRIVATE_IMPORT',
              data: {
                importedPackage: 'aPackage',
                sourcePath: 'packages/kbn-foo/common.shared.shared-common.true.ts',
                suggestion: CORE_PRIVATE_SUGGESTION,
              },
            },
          ],
        },
        {
          ...make(
            {
              dir: 'x-pack/solutions/security/plugins/allowlisted/',
              group: 'security',
              visibility: 'private',
            },
            CORE_PRIVATE
          ),
          errors: [{ line: 1, messageId: 'ILLEGAL_IMPORT' }],
        },
      ],
    });
  });
}
