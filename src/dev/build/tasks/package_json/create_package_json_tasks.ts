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
import type { PnpmField } from './render_pnpm_workspace';
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
     * Replaces `workspace:*` dependencies with `file:` dependencies pointing at the
     * package's directory (copied into the build). When installing dependencies,
     * pnpm copies these `file:` dependencies into `node_modules` instead of
     * symlinking like we do in development.
     */
    const transformedDeps = Object.fromEntries(
      Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
        .filter(([id]) => !id.startsWith('@kbn/') || distPkgIds.has(id))
        .map(([name, version]) => {
          const dir = distPkgDirById.get(name);
          return [name, dir ? `file:${dir}` : version];
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
        ...Object.fromEntries(
          plugins.map((p) => [p.manifest.id, `file:${p.normalizedRepoRelativeDir}`])
        ),
      },
    };

    await write(build.resolvePath('package.json'), JSON.stringify(newPkg, null, '  '));

    // pnpm 11 reads install settings + overrides only from pnpm-workspace.yaml,
    // not package.json. This local (settings-only, no `packages:`) file makes the
    // build dir its own workspace root, so the in-build install resolves the same
    // hoisted layout + pinned overrides as the repo. Removed by CleanPackageManagerRelatedFiles.
    await write(
      build.resolvePath('pnpm-workspace.yaml'),
      renderPnpmWorkspace(pkg.pnpm as PnpmField | undefined)
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
