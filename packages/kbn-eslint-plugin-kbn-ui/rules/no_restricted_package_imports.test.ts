/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { createRequire } from 'module';
import { RuleTester } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import {
  assertBoundariesConfig,
  BOUNDARIES_PATH,
  getPrivateKbnUiPackageIds,
  NoRestrictedPackageImports,
} from './no_restricted_package_imports';

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

const opts = [
  {
    alwaysAllowed: ['src/platform/kbn-ui/', 'src/core/'],
    privatePackages: [
      '@kbn/ui-feedback',
      '@kbn/ui-chrome-layout',
      '@kbn/ui-chrome-layout-constants',
    ],
    packages: {
      '@kbn/ui-feedback': {
        alternative: 'Use the feedback plugin API instead.',
        overrides: [
          {
            path: 'x-pack/platform/plugins/private/feedback/',
            reason: 'Owning plugin.',
          },
        ],
      },
      '@kbn/ui-chrome-layout': {
        alternative: 'Use chrome layout APIs instead.',
        overrides: [
          {
            path: 'src/platform/plugins/shared/developer_toolbar/',
            reason: 'Needs useLayoutUpdate; no core re-export yet.',
          },
        ],
      },
      '@kbn/ui-chrome-layout-constants': {
        alternative: 'Import from @kbn/core-chrome-layout-constants instead.',
      },
    },
  },
];

tester.run('no_restricted_package_imports', NoRestrictedPackageImports, {
  valid: [
    {
      name: 'shared package is unrestricted even when not listed in privatePackages',
      filename: 'src/plugins/discover/public/app.tsx',
      code: `import { KbnInfoCallout } from '@kbn/ui-callout';`,
      options: opts,
    },
    {
      name: 'package-specific owner may import restricted package',
      filename: 'x-pack/platform/plugins/private/feedback/public/plugin.tsx',
      code: `import type { FeedbackRegistryEntry } from '@kbn/ui-feedback';`,
      options: opts,
    },
    {
      name: 'any kbn-ui package may import private packages',
      filename: 'src/platform/kbn-ui/side-navigation/src/stories.tsx',
      code: `import { ChromeLayout } from '@kbn/ui-chrome-layout';`,
      options: opts,
    },
    {
      name: 'any core package may import private packages',
      filename: 'src/core/packages/apps/browser/src/foo.ts',
      code: `import { Feedback } from '@kbn/ui-feedback';`,
      options: opts,
    },
    {
      name: 'longest private package id wins over shorter prefix',
      filename: 'src/core/packages/chrome/browser/src/index.ts',
      code: `import { x } from '@kbn/ui-chrome-layout-constants';`,
      options: opts,
    },
  ],
  invalid: [
    {
      name: 'app may not import private feedback package',
      filename: 'src/plugins/discover/public/app.tsx',
      code: `import { Feedback } from '@kbn/ui-feedback';`,
      options: opts,
      errors: [
        {
          messageId: 'restrictedImport',
          data: {
            package: '@kbn/ui-feedback',
            alternative: 'Use the feedback plugin API instead.',
            boundariesPath: BOUNDARIES_PATH,
          },
        },
      ],
    },
    {
      name: 'private package without policy still uses default alternative',
      filename: 'src/plugins/discover/public/app.tsx',
      code: `import { x } from '@kbn/ui-chrome-layout-constants';`,
      options: [
        {
          alwaysAllowed: ['src/platform/kbn-ui/', 'src/core/'],
          privatePackages: ['@kbn/ui-chrome-layout-constants'],
          packages: {},
        },
      ],
      errors: [
        {
          messageId: 'restrictedImport',
          data: {
            package: '@kbn/ui-chrome-layout-constants',
            alternative: 'This package is private; use the owning plugin or core facade instead.',
            boundariesPath: BOUNDARIES_PATH,
          },
        },
      ],
    },
    {
      name: 'feedback owner may not import chrome-layout',
      filename: 'x-pack/platform/plugins/private/feedback/public/plugin.tsx',
      code: `import { ChromeLayout } from '@kbn/ui-chrome-layout';`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
    },
    {
      name: 'export-from is checked',
      filename: 'src/plugins/discover/public/app.tsx',
      code: `export { Feedback } from '@kbn/ui-feedback';`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
    },
    {
      name: 'require is checked',
      filename: 'src/plugins/discover/public/app.tsx',
      code: `const feedback = require('@kbn/ui-feedback');`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
    },
    {
      name: 'dynamic import is checked',
      filename: 'src/plugins/discover/public/app.tsx',
      code: `const mod = import('@kbn/ui-feedback');`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
    },
    {
      name: 'subpath import is checked',
      filename: 'src/plugins/discover/public/app.tsx',
      code: `import { x } from '@kbn/ui-feedback/src/types';`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
    },
  ],
});

describe('getPrivateKbnUiPackageIds', () => {
  it('uses manifest visibility and kbn-ui directory scope', () => {
    const ids = getPrivateKbnUiPackageIds([
      {
        id: '@kbn/ui-callout',
        normalizedRepoRelativeDir: 'src/platform/kbn-ui/callout',
        manifest: { visibility: 'shared' },
      },
      {
        id: '@kbn/ui-feedback',
        normalizedRepoRelativeDir: 'src/platform/kbn-ui/feedback',
        manifest: { visibility: 'private' },
      },
      {
        id: '@kbn/ui-shared-deps-npm',
        normalizedRepoRelativeDir: 'src/platform/packages/private/kbn-ui-shared-deps-npm',
        manifest: { visibility: 'private' },
      },
    ]);

    expect([...ids].sort()).toEqual(['@kbn/ui-feedback']);
  });

  it('discovers real private kbn-ui packages from manifests', () => {
    const ids = getPrivateKbnUiPackageIds(getPackages(REPO_ROOT));

    expect(ids.has('@kbn/ui-feedback')).toBe(true);
    expect(ids.has('@kbn/ui-chrome-layout')).toBe(true);
    expect(ids.has('@kbn/ui-storybook-config')).toBe(true);

    expect(ids.has('@kbn/ui-callout')).toBe(false);
    expect(ids.has('@kbn/ui-shared-deps-npm')).toBe(false);
    expect(ids.has('@kbn/ui-shared-deps-src')).toBe(false);
    expect(ids.has('@kbn/ui-settings-plugin')).toBe(false);
  });
});

describe('assertBoundariesConfig', () => {
  it('accepts the real boundaries file', () => {
    const requireFromRepo = createRequire(__filename);
    const config = requireFromRepo(path.join(REPO_ROOT, BOUNDARIES_PATH));
    expect(() => assertBoundariesConfig(config)).not.toThrow();
  });

  it('rejects overrides without a reason', () => {
    expect(() =>
      assertBoundariesConfig({
        packages: {
          '@kbn/ui-chrome-layout': {
            overrides: [
              {
                path: 'src/platform/plugins/shared/developer_toolbar/',
                reason: '',
              },
            ],
          },
        },
      })
    ).toThrow(/missing reason/);
  });
});
