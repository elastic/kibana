/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UNCATEGORIZED_MODULE_ID } from '../../affected-packages/index.ts';

import type { FTRManifestEntry } from './ftr_manifests.ts';
import type { FtrDomainSelection, FtrModuleGraph } from './selective_ftr_domains.ts';
import {
  includesFtrEntry,
  resolveFtrDomains,
  summarizeFtrDomainSelection,
} from './selective_ftr_domains.ts';
import { ftrTestChannels } from './test_channels.ts';

interface FakeModule {
  dir: string;
  group?: string;
  /** Modules this one lists in kbn_references. */
  references?: string[];
}

const MODULES: Record<string, FakeModule> = {
  '@kbn/core': { dir: 'src/core', group: 'platform' },
  '@kbn/fleet': {
    dir: 'x-pack/platform/plugins/fleet',
    group: 'platform',
    references: ['@kbn/core'],
  },
  '@kbn/platform-tests': { dir: 'x-pack/platform/test', group: 'platform' },
  '@kbn/apm': {
    dir: 'x-pack/solutions/observability/plugins/apm',
    group: 'observability',
    references: ['@kbn/fleet', '@kbn/obs-shared'],
  },
  '@kbn/obs-shared': {
    dir: 'x-pack/solutions/observability/plugins/obs_shared',
    group: 'platform',
  },
  '@kbn/obs-tests': { dir: 'x-pack/solutions/observability/test', group: 'observability' },
  '@kbn/security-solution': {
    dir: 'x-pack/solutions/security/plugins/security_solution',
    group: 'security',
    references: ['@kbn/fleet', '@kbn/discoveries'],
  },
  '@kbn/discoveries': { dir: 'x-pack/solutions/security/packages/discoveries', group: 'security' },
  '@kbn/security-tests': { dir: 'x-pack/solutions/security/test', group: 'security' },
  '@kbn/search-tests': { dir: 'x-pack/solutions/search/test', group: 'search' },
  '@kbn/search-plugin': {
    dir: 'x-pack/solutions/search/plugins/search',
    group: 'search',
    references: ['@kbn/fleet'],
  },
  '@kbn/test-plugin-no-group': {
    dir: 'x-pack/platform/test/plugins/no_group',
    references: ['@kbn/discoveries'],
  },
  '@kbn/tooling-no-group': { dir: 'packages/kbn-tooling' },
  '@kbn/scout': { dir: 'src/platform/packages/shared/kbn-scout', group: 'platform' },
};

const fakeGraph: FtrModuleGraph = {
  moduleForPath: (filePath) => {
    const match = Object.entries(MODULES)
      .filter(([, { dir }]) => filePath.startsWith(`${dir}/`))
      .sort(([, a], [, b]) => b.dir.length - a.dir.length)[0];
    return match ? match[0] : UNCATEGORIZED_MODULE_ID;
  },
  groupOf: (moduleId) => MODULES[moduleId]?.group,
  downstreamOf: (moduleIds) => {
    const result = new Set(moduleIds);
    let grew = true;
    while (grew) {
      grew = false;
      for (const [id, { references = [] }] of Object.entries(MODULES)) {
        if (!result.has(id) && references.some((ref) => result.has(ref))) {
          result.add(id);
          grew = true;
        }
      }
    }
    return result;
  },
};

const entry = (domain: string, path: string, project?: string): FTRManifestEntry => ({
  path,
  domain,
  project,
  arch: domain === 'platform' ? 'stateful' : 'serverless',
  queue: 'n2-4-spot',
  testChannels: ftrTestChannels.default,
  enabled: true,
});

const BASE_DIR = 'x-pack/platform/test/deployment_agnostic';
const ENTRIES: FTRManifestEntry[] = [
  entry('platform', 'x-pack/platform/test/functional/config.ts'),
  entry('base', `${BASE_DIR}/oblt.serverless.config.ts`, 'observability'),
  entry('base', `${BASE_DIR}/oblt.streams.serverless.config.ts`, 'observability'),
  entry('base', `${BASE_DIR}/search.serverless.config.ts`, 'search'),
  entry('base', `${BASE_DIR}/security.serverless.config.ts`, 'security'),
  entry('observability', 'x-pack/solutions/observability/test/config.ts'),
  entry('security', 'x-pack/solutions/security/test/config.ts'),
  // platform-located config filed under the search manifest
  entry('search', 'x-pack/solutions/security/test/search_project/config.ts'),
  entry('search', 'x-pack/solutions/search/test/config.ts'),
];

const resolve = (changedFiles: string[], manifestEntries = ENTRIES) =>
  resolveFtrDomains({ changedFiles, manifestEntries, graph: fakeGraph });

const selectedPaths = (selection: FtrDomainSelection, manifestEntries = ENTRIES) =>
  manifestEntries.filter((e) => includesFtrEntry(selection, e)).map((e) => e.path);

describe('resolveFtrDomains', () => {
  it('runs only the solution and the base config booting its project for a solution-only change', () => {
    const selection = resolve(['x-pack/solutions/search/plugins/search/server/index.ts']);

    expect(selection.all).toBe(false);
    expect(selectedPaths(selection)).toEqual([
      `${BASE_DIR}/search.serverless.config.ts`,
      'x-pack/solutions/security/test/search_project/config.ts',
      'x-pack/solutions/search/test/config.ts',
    ]);
  });

  it('runs every base config of a solution that has several', () => {
    const selection = resolve(['x-pack/solutions/observability/plugins/apm/public/app.tsx']);

    expect(selectedPaths(selection)).toEqual([
      `${BASE_DIR}/oblt.serverless.config.ts`,
      `${BASE_DIR}/oblt.streams.serverless.config.ts`,
      'x-pack/solutions/observability/test/config.ts',
    ]);
  });

  it('unions the solutions of several changed modules', () => {
    const selection = resolve([
      'x-pack/solutions/observability/plugins/apm/public/app.tsx',
      'x-pack/solutions/search/plugins/search/server/index.ts',
    ]);

    expect(selection.all).toBe(false);
    expect(selection.all === false && [...selection.domains].sort()).toEqual([
      'observability',
      'search',
    ]);
  });

  it('adds every solution that consumes a changed shared solution package', () => {
    const selection = resolve(['x-pack/solutions/security/packages/discoveries/index.ts']);

    // @kbn/test-plugin-no-group (no group) consumes it and counts as platform
    expect(selection.all === false && [...selection.domains].sort()).toEqual([
      'base',
      'platform',
      'security',
    ]);
  });

  it('runs platform, all base configs and dependent solutions for a platform module under a solution folder', () => {
    const selection = resolve(['x-pack/solutions/observability/plugins/obs_shared/index.ts']);

    expect(selectedPaths(selection)).toEqual([
      'x-pack/platform/test/functional/config.ts',
      `${BASE_DIR}/oblt.serverless.config.ts`,
      `${BASE_DIR}/oblt.streams.serverless.config.ts`,
      `${BASE_DIR}/search.serverless.config.ts`,
      `${BASE_DIR}/security.serverless.config.ts`,
      'x-pack/solutions/observability/test/config.ts',
    ]);
  });

  it('runs a config owned by an affected module without pulling in the rest of its domain', () => {
    const selection = resolve(['x-pack/solutions/security/test/search_project/helpers.ts']);

    expect(selectedPaths(selection)).toEqual([
      `${BASE_DIR}/security.serverless.config.ts`,
      'x-pack/solutions/security/test/config.ts',
      'x-pack/solutions/security/test/search_project/config.ts',
    ]);
  });

  it('always runs a base config that declares no project', () => {
    const entries = [...ENTRIES, entry('base', `${BASE_DIR}/unassigned.serverless.config.ts`)];
    const selection = resolve(['x-pack/solutions/security/test/config.ts'], entries);

    expect(selectedPaths(selection, entries)).toContain(
      `${BASE_DIR}/unassigned.serverless.config.ts`
    );
  });

  it('returns all when every domain is affected', () => {
    expect(resolve(['x-pack/platform/plugins/fleet/server/index.ts'])).toMatchObject({
      all: true,
    });
  });

  it.each([
    ['an FTR-critical file', ['pnpm-lock.yaml']],
    ['an FTR manifest', ['.buildkite/ftr-manifests/ftr_security_serverless_configs.yml']],
    ['a file outside any module', ['typings/index.d.ts']],
    ['a module without a group', ['packages/kbn-tooling/src/index.ts']],
    ['no files', []],
  ])('returns all for %s', (_, changedFiles) => {
    expect(resolve(changedFiles)).toMatchObject({ all: true });
  });

  it('ignores FTR-irrelevant files and FTR-excluded modules when attributing domains', () => {
    const selection = resolve([
      'x-pack/platform/plugins/fleet/README.md',
      'src/platform/packages/shared/kbn-scout/src/index.ts',
      'x-pack/solutions/security/plugins/security_solution/server/index.ts',
    ]);

    expect(selection.all === false && [...selection.domains]).toEqual(['security']);
  });

  it('selects nothing when only FTR-irrelevant files and excluded modules changed', () => {
    const selection = resolve([
      'x-pack/platform/plugins/fleet/README.md',
      'src/platform/packages/shared/kbn-scout/src/index.ts',
    ]);

    expect(selectedPaths(selection)).toEqual([]);
  });
});

describe('summarizeFtrDomainSelection', () => {
  it('reports partially selected base configs on both sides', () => {
    const selection = resolve(['x-pack/solutions/security/plugins/security_solution/index.ts']);

    expect(summarizeFtrDomainSelection(selection, ENTRIES)).toEqual({
      selected: ['base (1/4 configs)', 'security'],
      skipped: ['base (3/4 configs)', 'observability', 'platform', 'search'],
    });
  });
});
