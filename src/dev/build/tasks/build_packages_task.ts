/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import * as Fsp from 'fs/promises';

import { runBazel } from '@kbn/bazel-runner';
import * as Peggy from '@kbn/peggy';
import { asyncForEach } from '@kbn/std';
import { withFastAsyncTransform, TransformConfig } from '@kbn/babel-transform';

import { Task, scanCopy, write, deleteAll } from '../lib';
import type { Record } from '../lib/fs_records';

const distPerms = (rec: Record) => (rec.type === 'file' ? 0o644 : 0o755);

export const BuildBazelPackages: Task = {
  description: 'Building distributable versions of Bazel packages',
  async run(config, log, build) {
    const packages = await config.getProductionPackages();
    const pkgIdsInNodeModules = await config.getPkgIdsInNodeModules();

    log.info(`Building Bazel artifacts which are necessary for the build`);
    await runBazel([
      'build',
      '//packages/kbn-ui-shared-deps-npm:shared_built_assets',
      '//packages/kbn-ui-shared-deps-src:shared_built_assets',
      '//packages/kbn-monaco:target_workers',
      '--show_result=1',
      '--define=dist=true',
    ]);

    const transformConfig: TransformConfig = {
      disableSourceMaps: true,
      ignoredPkgIds: pkgIdsInNodeModules,
    };

    await withFastAsyncTransform(transformConfig, async (transform) => {
      await asyncForEach(packages, async (pkg) => {
        const pkgDistPath = build.resolvePath(pkg.normalizedRepoRelativeDir);
        const peggyConfigOutputPaths = new Set<string>();
        const pkgSrcPath = config.resolveFromRepo(pkg.normalizedRepoRelativeDir);

        // copy the built npm_module target dir into the build, package.json is updated to copy
        // the sources we actually end up using into the node_modules directory when we run
        // yarn install
        await scanCopy({
          source: pkgSrcPath,
          destination: pkgDistPath,
          permissions: distPerms,
          filter: (rec) => !rec.source.name.endsWith('.d.ts'),
          async map(rec) {
            switch (Path.extname(rec.source.name)) {
              case '.peggy': {
                const result = await Peggy.getJsSource({
                  path: rec.source.abs,
                  format: 'commonjs',
                  optimize: 'speed',
                });

                if (result.config) {
                  // if there was a config file for this peggy grammar, capture its output path and
                  // delete it after the copy is complete
                  peggyConfigOutputPaths.add(
                    Path.resolve(pkgDistPath, Path.relative(pkgSrcPath, result.config.path))
                  );
                }

                return {
                  ...rec,
                  dest: rec.dest.withName(rec.dest.name + '.js'),
                  content: result.source,
                };
              }

              case '.ts':
              case '.tsx':
              case '.js':
              case '.mjs':
              case '.jsx': {
                const source = await Fsp.readFile(rec.source.abs, 'utf8');
                const result = await transform(rec.source.abs, source);
                return {
                  ...rec,
                  dest: rec.dest.withExt('.js'),
                  content: result.code,
                };
              }
            }
          },
        });

        if (
          pkg.manifest.id === '@kbn/ui-shared-deps-src' ||
          pkg.manifest.id === '@kbn/ui-shared-deps-npm'
        ) {
          await scanCopy({
            source: config.resolveFromRepo(
              'bazel-bin',
              pkg.normalizedRepoRelativeDir,
              'shared_built_assets'
            ),
            destination: build.resolvePath(pkg.normalizedRepoRelativeDir, 'shared_built_assets'),
            permissions: distPerms,
            filter: (rec) => rec.source.ext !== '.map',
          });
        }

        if (pkg.manifest.id === '@kbn/monaco') {
          await scanCopy({
            source: config.resolveFromRepo(
              'bazel-bin',
              pkg.normalizedRepoRelativeDir,
              'target_workers'
            ),
            destination: build.resolvePath(pkg.normalizedRepoRelativeDir, 'target_workers'),
            permissions: distPerms,
            filter: (rec) => rec.source.ext !== '.map',
          });
        }

        // cleanup any peggy config files
        if (peggyConfigOutputPaths.size) {
          await deleteAll(Array.from(peggyConfigOutputPaths), log);
        }

        await write(
          Path.resolve(pkgDistPath, 'kibana.jsonc'),
          JSON.stringify(pkg.manifest, null, 2)
        );
        await write(
          Path.resolve(pkgDistPath, 'package.json'),
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

        log.info(`Copied`, pkg.manifest.id, 'into build');
      });
    });
  },
};
