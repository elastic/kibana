/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { NoCoreInternalImportsRule } from './no_core_internal_imports';
import { formatSuggestions } from '../helpers/report';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

const make = (filename: string, importPath: string, imp = 'import') => ({
  filename,
  code: `${imp} { Foo } from '${importPath}'`,
});

const tsTester = [
  '@typescript-eslint/parser',
  new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
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

const suggestion = formatSuggestions([
  `The /internal subpath of core packages is reserved for use within src/core/.`,
  `Import from the package's public API instead (e.g. '@kbn/core-*-server' without '/internal').`,
  `Reach out to #kibana-core for help.`,
]);

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/imports/no_core_internal_imports', NoCoreInternalImportsRule, {
      valid: [
        // Core package importing /internal (allowed)
        make(
          '/repo/src/core/packages/saved-objects/server-internal/src/service.ts',
          '@kbn/core-execution-context-server/internal'
        ),
        // Core integration test importing /internal (allowed)
        make(
          '/repo/src/core/server/integration_tests/test.ts',
          '@kbn/core-saved-objects-import-export-server/internal'
        ),
        // Any package importing /mocks (allowed)
        make(
          '/repo/src/platform/plugins/shared/my-plugin/server/test.ts',
          '@kbn/core-execution-context-server/mocks'
        ),
        // Any package importing old -internal package (allowed - different pattern)
        make(
          '/repo/src/platform/plugins/shared/my-plugin/server/index.ts',
          '@kbn/core-saved-objects-server-internal'
        ),
        // Regular core package import without subpath (allowed)
        make(
          '/repo/x-pack/platform/plugins/shared/alerting/server/index.ts',
          '@kbn/core-saved-objects-server'
        ),
        // Non-core package with /internal subpath (allowed - not @kbn/core-*)
        make(
          '/repo/src/platform/plugins/shared/my-plugin/server/index.ts',
          '@kbn/some-other-package/internal'
        ),
        // Core package importing /base_internal from inside src/core/ (allowed)
        make(
          '/repo/src/core/packages/saved-objects/server-internal/src/service.ts',
          '@kbn/core-saved-objects-server/base_internal'
        ),
        // Pre-existing violation allowlist: kbn-check-saved-objects-cli (allowed until moved to src/core/)
        make(
          '/repo/packages/kbn-check-saved-objects-cli/src/index.ts',
          '@kbn/core-saved-objects-server/internal'
        ),
        // Pre-existing violation allowlist: kbn-migrator-test-kit (allowed until moved to src/core/)
        make(
          '/repo/src/platform/packages/private/kbn-migrator-test-kit/src/index.ts',
          '@kbn/core-saved-objects-server/internal'
        ),
        // Pre-existing violation allowlist: platform plugin (allowed until cleaned up)
        make(
          '/repo/x-pack/platform/plugins/shared/encrypted_saved_objects/server/create_model_version.ts',
          '@kbn/core-saved-objects-server/internal'
        ),
      ],

      invalid: [
        // Platform plugin importing /internal (blocked)
        {
          ...make(
            '/repo/src/platform/plugins/shared/my-plugin/server/index.ts',
            '@kbn/core-execution-context-server/internal'
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_INTERNAL_IMPORT',
              data: {
                importRequest: '@kbn/core-execution-context-server/internal',
                suggestion,
              },
            },
          ],
        },
        // Solution plugin importing /internal (blocked)
        {
          ...make(
            '/repo/x-pack/solutions/security/plugins/security_solution/server/index.ts',
            '@kbn/core-saved-objects-server/internal'
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_INTERNAL_IMPORT',
            },
          ],
        },
        // X-pack platform plugin importing /internal (blocked)
        {
          ...make(
            '/repo/x-pack/solutions/observability/plugins/observability/server/index.ts',
            '@kbn/core-saved-objects-import-export-server/internal'
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_INTERNAL_IMPORT',
            },
          ],
        },
        // Package outside core importing /internal (blocked)
        {
          ...make(
            '/repo/packages/kbn-some-other-package/src/index.ts',
            '@kbn/core-data-streams-server/internal'
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_INTERNAL_IMPORT',
            },
          ],
        },
        // Platform plugin importing /base_internal (blocked)
        {
          ...make(
            '/repo/src/platform/plugins/shared/alerting/server/index.ts',
            '@kbn/core-saved-objects-server/base_internal'
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_INTERNAL_IMPORT',
            },
          ],
        },
        // Platform plugin importing /api_internal (blocked)
        {
          ...make(
            '/repo/src/platform/plugins/shared/my-plugin/server/index.ts',
            '@kbn/core-saved-objects-server/api_internal'
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_INTERNAL_IMPORT',
            },
          ],
        },
        // Package outside core importing /migration_internal (blocked)
        {
          ...make(
            '/repo/packages/kbn-some-other-package/src/index.ts',
            '@kbn/core-saved-objects-server/migration_internal'
          ),
          errors: [
            {
              line: 1,
              messageId: 'CORE_INTERNAL_IMPORT',
            },
          ],
        },
      ],
    });
  });
}
