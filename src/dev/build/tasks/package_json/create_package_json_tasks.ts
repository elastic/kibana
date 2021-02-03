/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import normalizePosixPath from 'normalize-path';
// @ts-ignore
import { transformDependencies } from '@kbn/pm';
import { findUsedDependencies } from './find_used_dependencies';
import { read, write, Task } from '../../lib';

export const CreatePackageJson: Task = {
  description: 'Creating build-ready version of package.json',

  async run(config, log, build) {
    const pkg = config.getKibanaPkg();
    const transformedDeps = transformDependencies(pkg.dependencies as { [key: string]: string });
    const foundPkgDeps = await findUsedDependencies(
      transformedDeps,
      normalizePosixPath(build.resolvePath('.'))
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
