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
import * as Peggy from '@kbn/peggy';

import { Task, scanCopy, write, deleteAll } from '../lib';

export const BuildBazelPackages: Task = {
  description: 'Building distributable versions of Bazel packages',
  async run(config, log, build) {
    const packages = (await discoverBazelPackages(REPO_ROOT)).filter((pkg) => !pkg.isDevOnly());

    log.info(`Preparing Bazel projects production build non-devOnly packages`);
    await runBazel(['build', '//packages:build']);

    for (const pkg of packages) {
      log.info(`Copying build of`, pkg.manifest.id, 'into build');

      const pkgDirInBuild = build.resolvePath(pkg.normalizedRepoRelativeDir);
      const peggyConfigOutputPaths = new Set<string>();
      const pkgBuildDir = config.resolveFromRepo(
        'bazel-bin',
        pkg.normalizedRepoRelativeDir,
        'npm_module'
      );

      // copy the built npm_module target dir into the build, package.json is updated to copy
      // the sources we actually end up using into the node_modules directory when we run
      // yarn install
      await scanCopy({
        source: pkgBuildDir,
        destination: pkgDirInBuild,
        permissions: (rec) => (rec.type === 'file' ? 0o644 : 0o755),
        filter: (rec) => !(rec.type === 'dir' && rec.source.name === 'target_web'),
        async map(rec) {
          const extname = Path.extname(rec.source.name);
          if (extname !== '.peggy') {
            return undefined;
          }

          const result = await Peggy.getJsSource({
            path: rec.source.abs,
            format: 'commonjs',
            optimize: 'speed',
          });

          if (result.config) {
            // if there was a config file for this peggy grammar, capture its output path and
            // delete it after the copy is complete
            peggyConfigOutputPaths.add(
              Path.resolve(pkgDirInBuild, Path.relative(pkgBuildDir, result.config.path))
            );
          }

          return {
            ...rec,
            dest: rec.dest.withName(rec.dest.name + '.js'),
            content: result.source,
          };
        },
      });

      // cleanup any peggy config files
      if (peggyConfigOutputPaths.size) {
        await deleteAll(Array.from(peggyConfigOutputPaths), log);
      }

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
