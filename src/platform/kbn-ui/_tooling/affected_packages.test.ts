/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/moon', () => ({
  getMoonChangedFiles: jest.fn(),
  getAffectedMoonProjectsFromChangedFiles: jest.fn(),
}));

import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  FORCE_ALL_CHANGED_PATHS,
  getPackageNameFromSourceRoot,
  resolveAffectedPackages,
  shouldForceAllPackages,
  topologicallySortPackages,
} from './affected_packages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PackageSpec {
  id: string;
  dependsOn?: string[];
}

/**
 * Creates a temporary kbn-ui root directory populated with minimal moon.yml
 * files for the given packages. Returns the temp directory path.
 * Clean up with fs.rmSync(dir, { recursive: true }) after each test.
 */
const createMockKbnUiRoot = (packages: Record<string, PackageSpec>): string => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-ui-test-'));
  for (const [name, { id, dependsOn = [] }] of Object.entries(packages)) {
    const pkgDir = path.join(tmpDir, name);
    fs.mkdirSync(pkgDir);
    const lines = [`id: '${id}'`];
    if (dependsOn.length > 0) {
      lines.push('dependsOn:');
      for (const dep of dependsOn) lines.push(`  - '${dep}'`);
    }
    fs.writeFileSync(path.join(pkgDir, 'moon.yml'), lines.join('\n'));
  }
  return tmpDir;
};

const createProject = (sourceRoot: string) => ({ id: sourceRoot, sourceRoot });

// ---------------------------------------------------------------------------
// topologicallySortPackages
// ---------------------------------------------------------------------------

describe('topologicallySortPackages', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns a single package unchanged', () => {
    tmpDir = createMockKbnUiRoot({ alpha: { id: '@kbn/ui-alpha' } });
    expect(topologicallySortPackages(['alpha'], tmpDir)).toEqual(['alpha']);
  });

  it('returns independent packages in alphabetical order', () => {
    tmpDir = createMockKbnUiRoot({
      zebra: { id: '@kbn/ui-zebra' },
      alpha: { id: '@kbn/ui-alpha' },
      mango: { id: '@kbn/ui-mango' },
    });
    expect(topologicallySortPackages(['zebra', 'alpha', 'mango'], tmpDir)).toEqual([
      'alpha',
      'mango',
      'zebra',
    ]);
  });

  it('places a dependency before its dependent', () => {
    tmpDir = createMockKbnUiRoot({
      'chrome-layout': { id: '@kbn/ui-chrome-layout' },
      'side-navigation': {
        id: '@kbn/ui-side-navigation',
        dependsOn: ['@kbn/ui-chrome-layout'],
      },
    });
    expect(topologicallySortPackages(['side-navigation', 'chrome-layout'], tmpDir)).toEqual([
      'chrome-layout',
      'side-navigation',
    ]);
  });

  it('handles a linear chain (a → b → c)', () => {
    tmpDir = createMockKbnUiRoot({
      a: { id: '@kbn/ui-a' },
      b: { id: '@kbn/ui-b', dependsOn: ['@kbn/ui-a'] },
      c: { id: '@kbn/ui-c', dependsOn: ['@kbn/ui-b'] },
    });
    expect(topologicallySortPackages(['c', 'a', 'b'], tmpDir)).toEqual(['a', 'b', 'c']);
  });

  it('handles a diamond (c and d both depend on a and b)', () => {
    tmpDir = createMockKbnUiRoot({
      a: { id: '@kbn/ui-a' },
      b: { id: '@kbn/ui-b' },
      c: { id: '@kbn/ui-c', dependsOn: ['@kbn/ui-a', '@kbn/ui-b'] },
      d: { id: '@kbn/ui-d', dependsOn: ['@kbn/ui-a', '@kbn/ui-b'] },
    });
    const result = topologicallySortPackages(['d', 'c', 'b', 'a'], tmpDir);
    // a and b must come before c and d
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('c'));
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('d'));
    expect(result.indexOf('b')).toBeLessThan(result.indexOf('c'));
    expect(result.indexOf('b')).toBeLessThan(result.indexOf('d'));
    // tie-broken alphabetically among leaves
    expect(result[0]).toBe('a');
    expect(result[1]).toBe('b');
  });

  it('ignores dependencies on packages outside kbn-ui', () => {
    tmpDir = createMockKbnUiRoot({
      alpha: {
        id: '@kbn/ui-alpha',
        dependsOn: ['@kbn/i18n', '@kbn/core-chrome-layout-constants'],
      },
      beta: { id: '@kbn/ui-beta' },
    });
    // external deps don't affect order — alphabetical wins
    expect(topologicallySortPackages(['beta', 'alpha'], tmpDir)).toEqual(['alpha', 'beta']);
  });

  it('throws a descriptive error when a dependency cycle is detected', () => {
    tmpDir = createMockKbnUiRoot({
      a: { id: '@kbn/ui-a', dependsOn: ['@kbn/ui-b'] },
      b: { id: '@kbn/ui-b', dependsOn: ['@kbn/ui-a'] },
    });
    expect(() => topologicallySortPackages(['a', 'b'], tmpDir)).toThrow(
      /Cyclic dependency detected among kbn-ui packages/
    );
  });
});

// ---------------------------------------------------------------------------
// resolveAffectedPackages (existing tests updated to pass kbnUiRoot)
// ---------------------------------------------------------------------------

describe('affected_packages', () => {
  let tmpDir: string;

  // Both test packages have no inter-kbn-ui deps so alphabetical order is preserved.
  beforeEach(() => {
    tmpDir = createMockKbnUiRoot({
      'other-package': { id: '@kbn/ui-other-package' },
      'side-navigation': { id: '@kbn/ui-side-navigation' },
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  const packageNames = ['other-package', 'side-navigation'];

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
        kbnUiRoot: tmpDir,
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
        kbnUiRoot: tmpDir,
      })
    ).toEqual(['other-package', 'side-navigation']);
  });

  it('returns all packages when publish pipeline files change', () => {
    const changedFiles = Array.from(FORCE_ALL_CHANGED_PATHS);

    expect(shouldForceAllPackages(changedFiles)).toBe(true);
    expect(
      resolveAffectedPackages({
        changedFiles,
        affectedProjects: [],
        packageNames,
        kbnUiRoot: tmpDir,
      })
    ).toEqual(['other-package', 'side-navigation']);
  });

  it('returns no packages when Moon reports no affected kbn-ui projects', () => {
    expect(
      resolveAffectedPackages({
        changedFiles: ['src/platform/packages/shared/kbn-i18n/src/index.ts'],
        affectedProjects: [createProject('src/platform/packages/shared/kbn-i18n')],
        packageNames,
        kbnUiRoot: tmpDir,
      })
    ).toEqual([]);
  });

  it('returns affected packages in dependency order', () => {
    const kbnUiRoot = createMockKbnUiRoot({
      'chrome-layout': { id: '@kbn/ui-chrome-layout' },
      'side-navigation': {
        id: '@kbn/ui-side-navigation',
        dependsOn: ['@kbn/ui-chrome-layout'],
      },
    });

    const result = resolveAffectedPackages({
      changedFiles: ['src/platform/kbn-ui/chrome-layout/src/index.ts'],
      affectedProjects: [
        createProject('src/platform/kbn-ui/chrome-layout'),
        createProject('src/platform/kbn-ui/side-navigation'),
      ],
      packageNames: ['chrome-layout', 'side-navigation'],
      kbnUiRoot,
    });

    expect(result).toEqual(['chrome-layout', 'side-navigation']);
    fs.rmSync(kbnUiRoot, { recursive: true });
  });
});
