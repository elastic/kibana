/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  FORCE_ALL_CHANGED_PATHS,
  getPackageNameFromSourceRoot,
  type MoonProject,
  resolveAffectedPackages,
  shouldForceAllPackages,
} from './affected_packages';

const packageNames = ['other-package', 'side-navigation'];

const createProject = (sourceRoot: string): MoonProject => ({
  config: {
    project: {
      metadata: {
        sourceRoot,
      },
    },
  },
  source: sourceRoot,
});

describe('affected_packages', () => {
  it('maps Moon project source roots to kbn-ui package directories', () => {
    expect(getPackageNameFromSourceRoot('src/platform/kbn-ui/side-navigation', packageNames)).toBe(
      'side-navigation'
    );
    expect(
      getPackageNameFromSourceRoot('src/platform/packages/shared/kbn-i18n', packageNames)
    ).toBe(undefined);
  });

  it('returns package directories for affected kbn-ui Moon projects', () => {
    expect(
      resolveAffectedPackages({
        changedFiles: ['src/platform/kbn-ui/side-navigation/src/components/navigation.tsx'],
        affectedProjects: [
          createProject('src/platform/kbn-ui/side-navigation'),
          createProject('src/platform/packages/shared/kbn-i18n'),
        ],
        packageNames,
      })
    ).toEqual(['side-navigation']);
  });

  it('returns all packages when shared kbn-ui tooling changes', () => {
    const changedFiles = ['src/platform/kbn-ui/_tooling/stamp_version.js'];

    expect(shouldForceAllPackages(changedFiles)).toBe(true);
    expect(
      resolveAffectedPackages({
        changedFiles,
        affectedProjects: [],
        packageNames,
      })
    ).toEqual(packageNames);
  });

  it('returns all packages when publish pipeline files change', () => {
    const changedFiles = Array.from(FORCE_ALL_CHANGED_PATHS);

    expect(shouldForceAllPackages(changedFiles)).toBe(true);
    expect(
      resolveAffectedPackages({
        changedFiles,
        affectedProjects: [],
        packageNames,
      })
    ).toEqual(packageNames);
  });

  it('returns no packages when Moon reports no affected kbn-ui projects', () => {
    expect(
      resolveAffectedPackages({
        changedFiles: ['src/platform/packages/shared/kbn-i18n/src/index.ts'],
        affectedProjects: [createProject('src/platform/packages/shared/kbn-i18n')],
        packageNames,
      })
    ).toEqual([]);
  });
});
