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
import {
  assertBoundariesConfig,
  BOUNDARIES_PATH,
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
    alwaysAllowed: ['src/platform/kbn-ui/'],
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
            path: 'src/core/packages/chrome/',
            reason: 'Core chrome mounts layout.',
          },
          {
            path: 'src/platform/plugins/shared/developer_toolbar/',
            reason: 'Needs useLayoutUpdate; no core re-export yet.',
          },
        ],
      },
      '@kbn/ui-chrome-layout-constants': {
        alternative: 'Import from @kbn/core-chrome-layout-constants instead.',
        overrides: [
          {
            path: 'src/core/packages/chrome/',
            reason: 'Core chrome re-exports constants.',
          },
        ],
      },
    },
  },
];

tester.run('no_restricted_package_imports', NoRestrictedPackageImports, {
  valid: [
    {
      name: 'unlisted package is unrestricted',
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
      name: 'any kbn-ui package may import restricted packages',
      filename: 'src/platform/kbn-ui/side-navigation/src/stories.tsx',
      code: `import { ChromeLayout } from '@kbn/ui-chrome-layout';`,
      options: opts,
    },
    {
      name: 'core chrome may import chrome layout packages',
      filename: 'src/core/packages/chrome/browser/src/index.ts',
      code: `import { x } from '@kbn/ui-chrome-layout-constants';`,
      options: opts,
    },
  ],
  invalid: [
    {
      name: 'app may not import restricted feedback package',
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
      name: 'non-chrome core may not import feedback',
      filename: 'src/core/packages/apps/browser/src/foo.ts',
      code: `import { Feedback } from '@kbn/ui-feedback';`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
    },
    {
      name: 'non-chrome core may not import chrome-layout',
      filename: 'src/core/packages/apps/browser/src/foo.ts',
      code: `import { ChromeLayout } from '@kbn/ui-chrome-layout';`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
    },
    {
      name: 'core chrome may not import feedback',
      filename: 'src/core/packages/chrome/browser/src/index.ts',
      code: `import { Feedback } from '@kbn/ui-feedback';`,
      options: opts,
      errors: [{ messageId: 'restrictedImport' }],
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

describe('assertBoundariesConfig', () => {
  it('accepts the real boundaries file with full checks', () => {
    const requireFromRepo = createRequire(__filename);
    const config = requireFromRepo(path.join(REPO_ROOT, BOUNDARIES_PATH));
    expect(() =>
      assertBoundariesConfig(config, {
        checkKnownPackageIds: true,
        checkPathsOnDisk: true,
      })
    ).not.toThrow();
  });

  it('rejects unknown package ids when checkKnownPackageIds is enabled', () => {
    expect(() =>
      assertBoundariesConfig(
        {
          packages: {
            '@kbn/ui-does-not-exist': {
              alternative: 'Use something else.',
            },
          },
        },
        {
          checkKnownPackageIds: true,
          knownPackageIds: new Set(['@kbn/ui-feedback']),
        }
      )
    ).toThrow(/unknown package "@kbn\/ui-does-not-exist"/);
  });

  it('rejects missing alternative', () => {
    expect(() =>
      assertBoundariesConfig({
        packages: {
          '@kbn/ui-feedback': {
            alternative: '',
          },
        },
      })
    ).toThrow(/missing alternative/);
  });

  it('rejects path prefixes without a trailing slash', () => {
    expect(() =>
      assertBoundariesConfig({
        alwaysAllowed: ['src/platform/kbn-ui'],
        packages: {
          '@kbn/ui-feedback': {
            alternative: 'Use the feedback plugin API instead.',
          },
        },
      })
    ).toThrow(/must end with \//);
  });

  it('rejects override paths that do not exist on disk', () => {
    expect(() =>
      assertBoundariesConfig(
        {
          packages: {
            '@kbn/ui-feedback': {
              alternative: 'Use the feedback plugin API instead.',
              overrides: [
                {
                  path: 'src/platform/plugins/shared/does-not-exist/',
                  reason: 'typo',
                },
              ],
            },
          },
        },
        { checkPathsOnDisk: true }
      )
    ).toThrow(/not an existing directory/);
  });

  it('rejects overrides without a reason', () => {
    expect(() =>
      assertBoundariesConfig({
        packages: {
          '@kbn/ui-chrome-layout': {
            alternative: 'Use chrome layout APIs instead.',
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
