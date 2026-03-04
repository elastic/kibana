/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAffectedMoonProjectIds, type MoonProjectMetadata } from '@kbn/moon';
import {
  getApiDocTargetsForMoonProjects,
  getMoonTouchedFilesArgs,
  parseTouchedFiles,
  requiresFullBuild,
  resolveAffectedBuildPlan,
  type RepoPackageLike,
} from './build_api_docs_affected';

const createPluginPackage = (name: string, pluginId: string): RepoPackageLike => ({
  name,
  isPlugin: () => true,
  manifest: {
    id: `@kbn/${name}`,
    plugin: { id: pluginId },
  },
});

const createPackage = (name: string, packageId: string): RepoPackageLike => ({
  name,
  isPlugin: () => false,
  manifest: {
    id: packageId,
  },
});

describe('build_api_docs_affected', () => {
  describe('getMoonTouchedFilesArgs', () => {
    it('returns base args when no options are provided', () => {
      expect(getMoonTouchedFilesArgs()).toEqual(['query', 'touched-files', '--json']);
    });

    it('includes --base when a base SHA is provided', () => {
      expect(getMoonTouchedFilesArgs({ base: 'abc123' })).toEqual([
        'query',
        'touched-files',
        '--json',
        '--base',
        'abc123',
      ]);
    });

    it('includes --status when a status filter is provided', () => {
      expect(getMoonTouchedFilesArgs({ status: 'staged' })).toEqual([
        'query',
        'touched-files',
        '--json',
        '--status',
        'staged',
      ]);
    });
  });

  it('parses touched files from moon query output', () => {
    expect(
      parseTouchedFiles(JSON.stringify({ files: ['x-pack/a.ts', 'src/b.ts', 'x-pack/a.ts'] }))
    ).toEqual(['src/b.ts', 'x-pack/a.ts']);
  });

  it('detects full-build trigger files', () => {
    expect(requiresFullBuild(['x-pack/plugins/foo/public/index.ts'])).toBe(false);
    expect(requiresFullBuild(['package.json'])).toBe(true);
    expect(requiresFullBuild(['.moon/workspace.yml'])).toBe(true);
    expect(requiresFullBuild(['.moon/tasks.yml'])).toBe(false);
    expect(requiresFullBuild(['packages/kbn-docs-utils/src/index.ts'])).toBe(true);
  });

  it('collects directly affected moon projects and transitive dependents', () => {
    const moonProjects: MoonProjectMetadata[] = [
      { id: 'project_a', sourceRoot: 'packages/a', dependsOn: [] },
      { id: 'project_b', sourceRoot: 'packages/b', dependsOn: ['project_a'] },
      { id: 'project_c', sourceRoot: 'x-pack/c', dependsOn: ['project_b'] },
      { id: 'project_d', sourceRoot: 'x-pack/d', dependsOn: [] },
    ];

    expect(getAffectedMoonProjectIds(['packages/a/src/index.ts'], moonProjects)).toEqual([
      'project_a',
      'project_b',
      'project_c',
    ]);
  });

  it('maps moon project ids to api-doc plugin/package targets', () => {
    const repoPackages: RepoPackageLike[] = [
      createPluginPackage('project_plugin', 'myPlugin'),
      createPackage('project_package', '@kbn/my-package'),
    ];

    expect(
      getApiDocTargetsForMoonProjects(
        ['project_plugin', 'project_package', 'missing_project'],
        repoPackages
      )
    ).toEqual({
      pluginTargets: ['myPlugin'],
      packageTargets: ['@kbn/my-package'],
    });
  });

  it('returns skip when no plugin/package targets are affected', () => {
    const moonProjects: MoonProjectMetadata[] = [
      { id: 'not_a_package', sourceRoot: 'docs', dependsOn: [] },
    ];

    const plan = resolveAffectedBuildPlan({
      touchedFiles: ['docs/readme.md'],
      moonProjects,
      repoPackages: [],
    });

    expect(plan.mode).toBe('skip');
    expect(plan.pluginFilter).toEqual([]);
    expect(plan.packageFilter).toEqual([]);
  });

  it('returns filtered mode with plugin/package filters', () => {
    const moonProjects: MoonProjectMetadata[] = [
      { id: 'project_plugin', sourceRoot: 'x-pack/plugins/my_plugin', dependsOn: [] },
      { id: 'project_package', sourceRoot: 'packages/my_package', dependsOn: [] },
    ];

    const repoPackages: RepoPackageLike[] = [
      createPluginPackage('project_plugin', 'myPlugin'),
      createPackage('project_package', '@kbn/my-package'),
    ];

    const plan = resolveAffectedBuildPlan({
      touchedFiles: ['x-pack/plugins/my_plugin/server/plugin.ts', 'packages/my_package/index.ts'],
      moonProjects,
      repoPackages,
    });

    expect(plan.mode).toBe('filtered');
    expect(plan.pluginFilter).toEqual(['myPlugin']);
    expect(plan.packageFilter).toEqual(['@kbn/my-package']);
  });

  it('falls back to full mode when affected targets exceed threshold', () => {
    const moonProjects: MoonProjectMetadata[] = [
      { id: 'project_plugin', sourceRoot: 'x-pack/plugins/my_plugin', dependsOn: [] },
      { id: 'project_package', sourceRoot: 'packages/my_package', dependsOn: [] },
    ];

    const repoPackages: RepoPackageLike[] = [
      createPluginPackage('project_plugin', 'myPlugin'),
      createPackage('project_package', '@kbn/my-package'),
    ];

    const plan = resolveAffectedBuildPlan({
      touchedFiles: ['x-pack/plugins/my_plugin/server/plugin.ts', 'packages/my_package/index.ts'],
      moonProjects,
      repoPackages,
      maxFilteredTargets: 1,
    });

    expect(plan.mode).toBe('full');
    expect(plan.pluginFilter).toEqual([]);
    expect(plan.packageFilter).toEqual([]);
  });
});
