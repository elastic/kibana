/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findUsedDependencies } from './find_used_dependencies';
import { read, write, Task } from '../../lib';

/**
 * Replaces `link:` dependencies with `file:` dependencies. When installing
 * dependencies, these `file:` dependencies will be copied into `node_modules`
 * instead of being symlinked.
 *
 * This will allow us to copy packages into the build and run `yarn`, which
 * will then _copy_ the `file:` dependencies into `node_modules` instead of
 * symlinking like we do in development.
 *
 * Additionally it also taken care of replacing `link:bazel-bin/` with
 * `file:` so we can also support the copy of the Bazel packages dist already into
 * build/packages to be copied into the node_modules
 */
export function transformDependencies(dependencies: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => {
      if (!version.startsWith('link:')) {
        return [name, version];
      }

      if (version.startsWith('link:bazel-bin/')) {
        return [name, version.replace('link:bazel-bin/', 'file:')];
      }

      return [name, version.replace('link:', 'file:')];
    })
  );
}

export const CreatePackageJson: Task = {
  description: 'Creating build-ready version of package.json',

  async run(config, log, build) {
    const pkg = config.getKibanaPkg();
    const transformedDeps = transformDependencies(pkg.dependencies as { [key: string]: string });
    const foundPkgDeps = await findUsedDependencies(transformedDeps, build.resolvePath('.'));

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
      },
      repository: pkg.repository,
      engines: {
        node: pkg.engines.node,
      },
      resolutions: pkg.resolutions,
      dependencies: foundPkgDeps,
    };

    await write(build.resolvePath('package.json'), JSON.stringify(newPkg, null, '  '));
  },
};

export const RemovePackageJsonDeps: Task = {
  description: 'Removing dependencies from package.json',

  async run(config, log, build) {
    const path = build.resolvePath('package.json');
    const pkg = JSON.parse(await read(path));

    delete pkg.dependencies;
    delete pkg.private;
    delete pkg.resolutions;

    await write(build.resolvePath('package.json'), JSON.stringify(pkg, null, '  '));
  },
};
