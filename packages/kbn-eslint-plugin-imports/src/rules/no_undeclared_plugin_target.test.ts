/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { NoUndeclaredPluginTargetRule } from './no_undeclared_plugin_target';

/**
 * Mock manifests keyed by pkgId.
 * - discover: browser plugin with extraPublicDirs: ['common']
 * - dashboard: browser plugin with no extraPublicDirs
 * - dataCatalog: server-only plugin (browser: false) with extraPublicDirs: ['common']
 * - uiActions: browser plugin with multi-segment extraPublicDirs: ['common/trigger_ids']
 * - somePackage: non-plugin package (no manifest.plugin)
 */
const MOCK_MANIFESTS: Record<string, any> = {
  '@kbn/discover-plugin': {
    type: 'plugin',
    plugin: { id: 'discover', browser: true, server: true, extraPublicDirs: ['common'] },
  },
  '@kbn/dashboard-plugin': {
    type: 'plugin',
    plugin: { id: 'dashboard', browser: true, server: true },
  },
  '@kbn/data-catalog-plugin': {
    type: 'plugin',
    plugin: { id: 'dataCatalog', browser: false, server: true, extraPublicDirs: ['common'] },
  },
  '@kbn/ui-actions-plugin': {
    type: 'plugin',
    plugin: {
      id: 'uiActions',
      browser: true,
      server: true,
      extraPublicDirs: ['common/trigger_ids'],
    },
  },
  '@kbn/some-package': {
    type: 'shared-common',
  },
};

/**
 * The source pkgId is determined by filename:
 * - files starting with 'test_' are classified as 'tests or mocks'
 * - files starting with 'tooling_' are classified as 'tooling'
 * - otherwise 'browser package' (normal production code)
 *
 * getPackageIdForPath returns '@kbn/my-plugin' for files in 'my-plugin/' prefix,
 * otherwise '@kbn/other-plugin'.
 */
jest.mock('../get_import_resolver', () => {
  return {
    getImportResolver() {
      return {
        resolve(req: string) {
          return { type: 'file', absolute: req };
        },
        getPackageIdForPath(path: string) {
          if (path.includes('discover-plugin/')) return '@kbn/discover-plugin';
          return '@kbn/other-plugin';
        },
        getPkgManifest(pkgId: string) {
          return MOCK_MANIFESTS[pkgId] ?? undefined;
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
          if (typeof path === 'string') {
            if (path.includes('test_')) return { type: 'tests or mocks' };
            if (path.includes('tooling_')) return { type: 'tooling' };
            if (path.includes('server_')) return { type: 'server package' };
            if (path.includes('common_')) return { type: 'common package' };
          }
          return { type: 'browser package' };
        },
      };
    },
  };
});

const tsTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

tsTester.run('@kbn/imports/no_undeclared_plugin_target', NoUndeclaredPluginTargetRule, {
  valid: [
    // Valid: declared 'public' target
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/discover-plugin/public';`,
    },
    // Valid: declared 'common' extraPublicDir
    {
      filename: 'production_code.ts',
      code: `import { Bar } from '@kbn/discover-plugin/common';`,
    },
    // Valid: dashboard plugin has 'public' declared
    {
      filename: 'production_code.ts',
      code: `import { Widget } from '@kbn/dashboard-plugin/public';`,
    },
    // Guard 2: type-only import skips validation even for undeclared target
    {
      filename: 'production_code.ts',
      code: `import type { Foo } from '@kbn/discover-plugin/server';`,
    },
    // Guard 1: test file skips validation (not browser/common)
    {
      filename: 'test_helpers.ts',
      code: `import { Foo } from '@kbn/discover-plugin/server';`,
    },
    // Guard 1: tooling file skips validation (not browser/common)
    {
      filename: 'tooling_scripts.ts',
      code: `import { Foo } from '@kbn/discover-plugin/server';`,
    },
    // Guard 1: server code skips validation (Node.js resolution, not bundled)
    {
      filename: 'server_plugin.ts',
      code: `import { Foo } from '@kbn/discover-plugin/server';`,
    },
    // Guard 1: server code importing deep subpath of common also skips
    {
      filename: 'server_plugin.ts',
      code: `import { FOO } from '@kbn/discover-plugin/common/constants';`,
    },
    // Common code importing valid targets is still validated and passes
    {
      filename: 'common_utils.ts',
      code: `import { Bar } from '@kbn/discover-plugin/common';`,
    },
    // Guard 4: same-plugin self-import skips validation
    {
      filename: 'discover-plugin/public/foo.ts',
      code: `import { Bar } from '@kbn/discover-plugin/server';`,
    },
    // Guard 5: server-only plugin (browser: false) skips validation
    {
      filename: 'production_code.ts',
      code: `import { API_BASE_PATH } from '@kbn/data-catalog-plugin';`,
    },
    // Guard 5: server-only plugin with target also skips
    {
      filename: 'production_code.ts',
      code: `import { API_BASE_PATH } from '@kbn/data-catalog-plugin/common';`,
    },
    // Guard 3: non-@kbn imports pass through
    {
      filename: 'production_code.ts',
      code: `import lodash from 'lodash';`,
    },
    // non-plugin package (no manifest.plugin)
    {
      filename: 'production_code.ts',
      code: `import { Util } from '@kbn/some-package/deep/path';`,
    },
    // Guard 6: .json imports pass through
    {
      filename: 'production_code.ts',
      code: `import config from '@kbn/discover-plugin/common/config.json';`,
    },
    // Guard 6: ?raw imports pass through
    {
      filename: 'production_code.ts',
      code: `import tpl from '@kbn/discover-plugin/public/template.html?raw';`,
    },
    // Deep subpath within a declared target is valid (prefix matching)
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/discover-plugin/common/deep/path';`,
    },
    // Deep subpath within 'public' target is also valid
    {
      filename: 'production_code.ts',
      code: `import { Bar } from '@kbn/discover-plugin/public/utils/helpers';`,
    },
    // Multi-segment extraPublicDirs: exact match
    {
      filename: 'production_code.ts',
      code: `import { TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';`,
    },
    // Multi-segment extraPublicDirs: sub-path of the declared target
    {
      filename: 'production_code.ts',
      code: `import { TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids/deep';`,
    },
    // Multi-segment extraPublicDirs: 'public' is always declared
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/ui-actions-plugin/public';`,
    },
  ],

  invalid: [
    // Undeclared target 'server' on discover plugin
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/discover-plugin/server';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/discover-plugin/server',
            pluginId: 'discover',
            targets: 'public, common',
          },
        },
      ],
    },
    // Bare import (empty target) to a browser plugin
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/discover-plugin';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/discover-plugin',
            pluginId: 'discover',
            targets: 'public, common',
          },
        },
      ],
    },
    // Undeclared target 'common' on dashboard (no extraPublicDirs)
    {
      filename: 'production_code.ts',
      code: `import { Widget } from '@kbn/dashboard-plugin/common';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/dashboard-plugin/common',
            pluginId: 'dashboard',
            targets: 'public',
          },
        },
      ],
    },
    // Deep subpath on an undeclared top-level target still fails
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/dashboard-plugin/common/deep/path';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/dashboard-plugin/common/deep/path',
            pluginId: 'dashboard',
            targets: 'public',
          },
        },
      ],
    },
    // Common code importing undeclared target is also validated
    {
      filename: 'dashboard_browser_import.ts',
      code: `import { Foo } from '@kbn/dashboard-plugin/common';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/dashboard-plugin/common',
            pluginId: 'dashboard',
            targets: 'public',
          },
        },
      ],
    },
    // Multi-segment: 'common' alone does NOT match 'common/trigger_ids'
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/ui-actions-plugin/common';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/ui-actions-plugin/common',
            pluginId: 'uiActions',
            targets: 'public, common/trigger_ids',
          },
        },
      ],
    },
    // Multi-segment: 'common/other' does NOT match 'common/trigger_ids'
    {
      filename: 'production_code.ts',
      code: `import { Foo } from '@kbn/ui-actions-plugin/common/other';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/ui-actions-plugin/common/other',
            pluginId: 'uiActions',
            targets: 'public, common/trigger_ids',
          },
        },
      ],
    },
    // export * from undeclared target (ExportAllDeclaration)
    {
      filename: 'production_code.ts',
      code: `export * from '@kbn/discover-plugin/server';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/discover-plugin/server',
            pluginId: 'discover',
            targets: 'public, common',
          },
        },
      ],
    },
    // export { x } from undeclared target (ExportNamedDeclaration with source)
    {
      filename: 'production_code.ts',
      code: `export { foo } from '@kbn/discover-plugin/server';`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/discover-plugin/server',
            pluginId: 'discover',
            targets: 'public, common',
          },
        },
      ],
    },
    // dynamic import() of undeclared target (ImportExpression)
    {
      filename: 'production_code.ts',
      code: `const mod = import('@kbn/discover-plugin/server');`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/discover-plugin/server',
            pluginId: 'discover',
            targets: 'public, common',
          },
        },
      ],
    },
    // require() of undeclared target (CallExpression)
    {
      filename: 'production_code.ts',
      code: `const mod = require('@kbn/discover-plugin/server');`,
      errors: [
        {
          messageId: 'INVALID_TARGET',
          data: {
            request: '@kbn/discover-plugin/server',
            pluginId: 'discover',
            targets: 'public, common',
          },
        },
      ],
    },
  ],
});

/**
 * Additional tests for import form coverage and edge cases.
 */
tsTester.run(
  '@kbn/imports/no_undeclared_plugin_target (import forms)',
  NoUndeclaredPluginTargetRule,
  {
    valid: [
      // export * from valid declared target
      {
        filename: 'production_code.ts',
        code: `export * from '@kbn/discover-plugin/public';`,
      },
      // export { x } from valid declared target
      {
        filename: 'production_code.ts',
        code: `export { foo } from '@kbn/discover-plugin/common';`,
      },
      // dynamic import() valid target
      {
        filename: 'production_code.ts',
        code: `const mod = import('@kbn/discover-plugin/public');`,
      },
      // require() valid target
      {
        filename: 'production_code.ts',
        code: `const mod = require('@kbn/discover-plugin/common');`,
      },
      // require.resolve() undeclared target — still validated, but of valid target
      {
        filename: 'production_code.ts',
        code: `const p = require.resolve('@kbn/discover-plugin/public');`,
      },
      // Mixed type/value import: isTypeOnlyImport returns true when ANY specifier is type-only
      // (import declaration level importKind='type' or specifier-level importKind='type')
      // Current behavior: declaration-level importKind='type' skips; individual specifier type doesn't skip unless ALL are type
      {
        filename: 'production_code.ts',
        code: `import type { Foo } from '@kbn/discover-plugin/server';`,
      },
      // Dynamic import() with template literal containing expression -> req is null, silently skipped
      {
        filename: 'production_code.ts',
        code: 'const mod = import(`@kbn/foo/${expr}`);',
      },
      // Missing manifest: unknown package returns undefined from getPkgManifest -> silently skipped
      {
        filename: 'production_code.ts',
        code: `import { Foo } from '@kbn/unknown-package/server';`,
      },
    ],
    invalid: [
      // require.resolve() of undeclared target
      {
        filename: 'production_code.ts',
        code: `const p = require.resolve('@kbn/discover-plugin/server');`,
        errors: [
          {
            messageId: 'INVALID_TARGET',
            data: {
              request: '@kbn/discover-plugin/server',
              pluginId: 'discover',
              targets: 'public, common',
            },
          },
        ],
      },
    ],
  }
);
