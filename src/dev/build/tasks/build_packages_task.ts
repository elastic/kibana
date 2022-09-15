/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { discoverBazelPackages } from '@kbn/bazel-packages';
import { runBazel } from '@kbn/bazel-runner';

import { Task, scanCopy, write } from '../lib';

export const BuildBazelPackages: Task = {
  description: 'Building distributable versions of Bazel packages',
  async run(config, log, build) {
    const packages = (await discoverBazelPackages(REPO_ROOT)).filter((pkg) => !pkg.isDevOnly());

    log.info(`Preparing Bazel projects production build non-devOnly packages`);
    await runBazel(['build', '//packages:build']);

    for (const pkg of packages) {
      log.info(`Copying build of`, pkg.manifest.id, 'into build');

      const pkgDirInBuild = build.resolvePath(pkg.normalizedRepoRelativeDir);

      // copy the built npm_module target dir into the build, package.json is updated to copy
      // the sources we actually end up using into the node_modules directory when we run
      // yarn install
      await scanCopy({
        source: config.resolveFromRepo('bazel-bin', pkg.normalizedRepoRelativeDir, 'npm_module'),
        destination: pkgDirInBuild,
        permissions: (rec) => (rec.isDirectory ? 0o755 : 0o644),
      });

      await write(
        Path.resolve(pkgDirInBuild, 'kibana.jsonc'),
        JSON.stringify(pkg.manifest, null, 2)
      );
      await write(
        Path.resolve(pkgDirInBuild, 'package.json'),
        JSON.stringify(
          {
            ...pkg.pkg,
            name: pkg.manifest.id,
            version: config.getBuildVersion(),
            private: undefined,
          },
          null,
          2
        )
      );
    }
  },
};
