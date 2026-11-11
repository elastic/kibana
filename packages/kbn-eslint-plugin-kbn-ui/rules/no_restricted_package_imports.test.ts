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
import { REPO_ROOT } from '@kbn/repo-info';
import { assertBoundariesConfig, BOUNDARIES_PATH } from './no_restricted_package_imports';

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
