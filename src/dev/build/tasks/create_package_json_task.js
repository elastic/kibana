/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { copyWorkspacePackages } from '@kbn/pm';

import { read, write } from '../lib';

export const CreatePackageJsonTask = {
  description: 'Creating build-ready version of package.json',

  async run(config, log, build) {
    const pkg = config.getKibanaPkg();

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
        release: config.isRelease(),
      },
      repository: pkg.repository,
      engines: {
        node: pkg.engines.node,
      },
      resolutions: pkg.resolutions,
      workspaces: pkg.workspaces,
      dependencies: pkg.dependencies,
    };

    if (build.isOss()) {
      newPkg.workspaces.packages = newPkg.workspaces.packages.filter(
        (p) => !p.startsWith('x-pack')
      );
    }

    await write(build.resolvePath('package.json'), JSON.stringify(newPkg, null, '  '));
  },
};

export const RemovePackageJsonDepsTask = {
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

export const RemoveWorkspacesTask = {
  description: 'Remove workspace artifacts',

  async run(config, log, build) {
    await copyWorkspacePackages(build.resolvePath());

    const path = build.resolvePath('package.json');
    const pkg = JSON.parse(await read(path));

    delete pkg.workspaces;

    await write(build.resolvePath('package.json'), JSON.stringify(pkg, null, '  '));
  },
};
