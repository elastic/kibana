/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginPackage } from '@kbn/repo-packages';
import { findUsedDependencies } from './find_used_dependencies';
import { renderPnpmWorkspace } from './render_pnpm_workspace';
import type { Task } from '../../lib';
import { read, write } from '../../lib';

export const CreatePackageJson: Task = {
  description: 'Creating build-ready version of package.json',

  async run(config, log, build) {
    const plugins = config.getDistPluginsFromRepo() as PluginPackage[];
    const distPackages = config.getDistPackagesFromRepo();
    const distPkgIds = new Set(distPackages.map((p) => p.id));
    const distPkgDirById = new Map(distPackages.map((p) => [p.id, p.normalizedRepoRelativeDir]));
    const pkg = config.getKibanaPkg();

    /**
     * Keep local `@kbn/*` deps on the `workspace:*` protocol so the in-build
     * install resolves them as workspace members (see the generated `packages:`
     * block + `injectWorkspacePackages` below). Under the hoisted linker a
     * `file:<dir>` dep is materialized as a symlink back to the source dir, which
     * DeletePackagesFromBuildRoot then deletes — leaving dangling links.
     * Injected workspace packages are instead hard-copied into `node_modules`, so
     * they survive the source deletion.
     */
    const transformedDeps = Object.fromEntries(
      Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
        .filter(([id]) => !id.startsWith('@kbn/') || distPkgIds.has(id))
        .map(([name, version]) => {
          const dir = distPkgDirById.get(name);
          return [name, dir ? 'workspace:*' : version];
        })
    );

    const newPkg = {
      name: pkg.name,
      private: true,
      description: pkg.description,
      keywords: pkg.keywords,
      version: config.getBuildVersion(),
      branch: pkg.branch,
      build: {
        number: config.getBuildNumber(),
        sha: config.getBuildSha(),
        distributable: true,
        release: config.isRelease,
        date: config.getBuildDate(),
      },
      repository: pkg.repository,
      engines: {
        node: pkg.engines?.node,
      },
      dependencies: {
        // include dependencies which are explicitly used
        ...(await findUsedDependencies(transformedDeps, build.resolvePath('.'), plugins)),
        // also include all plugin packages
        ...Object.fromEntries(plugins.map((p) => [p.manifest.id, 'workspace:*'])),
      },
    };

    await write(build.resolvePath('package.json'), JSON.stringify(newPkg, null, '  '));

    // pnpm 11 reads install settings + overrides only from pnpm-workspace.yaml.
    // Reuse the repo's authored settings (minus the generated `packages:` block),
    // then declare the dist packages as workspace members and enable injection so
    // `workspace:*` deps are hard-copied into node_modules instead of symlinked to
    // source. dedupeInjectedDeps is disabled so shared deps also copy rather than
    // symlink back to a source that DeletePackagesFromBuildRoot removes. Removed by
    // CleanPackageManagerRelatedFiles.
    const rootWorkspace = await read(config.resolveFromRepo('pnpm-workspace.yaml'));
    const settings = renderPnpmWorkspace(rootWorkspace);
    const memberDirs = distPackages.map((p) => p.normalizedRepoRelativeDir).sort();
    const packagesBlock = ['packages:', ...memberDirs.map((d) => `  - '${d}'`)].join('\n');
    const injectSettings = 'injectWorkspacePackages: true\ndedupeInjectedDeps: false';
    await write(
      build.resolvePath('pnpm-workspace.yaml'),
      `${packagesBlock}\n\n${settings.replace(/\n*$/, '')}\n${injectSettings}\n`
    );
  },
};

export const RemovePackageJsonDeps: Task = {
  description: 'Removing dependencies from package.json',

  async run(config, log, build) {
    const path = build.resolvePath('package.json');
    const pkg = JSON.parse(await read(path));

    delete pkg.dependencies;
    delete pkg.private;

    await write(build.resolvePath('package.json'), JSON.stringify(pkg, null, '  '));
  },
};
