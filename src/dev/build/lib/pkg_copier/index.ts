/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { cpus } from 'os';

import type { PackageFileMap } from '@kbn/repo-file-maps';
import { asyncForEachWithLimit } from '@kbn/std';
import type { Package } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';

import type { Build } from '../build';
import type { Config } from '../config';
import { deleteAll, write } from '../fs';
import { scanCopy } from '../scan_copy';
import type { Record as FsRecord } from '../fs_records';
import { fleetBuildTasks } from '../../tasks/fleet';

import { buildBatch } from './plan';
import { mkdirBatch } from './mkdir_batch';
import { createPool } from './pool';

const distPerms = (rec: FsRecord) => (rec.type === 'file' ? 0o644 : 0o755);

export async function copyPackages({
  packages,
  pkgFileMap,
  config,
  build,
  log,
}: {
  packages: Package[];
  pkgFileMap: PackageFileMap;
  config: Config;
  build: Build;
  log: ToolingLog;
}): Promise<void> {
  const pool = createPool({ disableSourceMaps: true });

  try {
    await asyncForEachWithLimit(packages, cpus().length, async (pkg) => {
      const pkgSrcPath = config.resolveFromRepo(pkg.normalizedRepoRelativeDir);
      const pkgDistPath = build.resolvePath(pkg.normalizedRepoRelativeDir);

      log.verbose(`starting copy of ${pkg.manifest.id}`);

      try {
        const repoFilePaths = new Set(Array.from(pkgFileMap.getFiles(pkg), (p) => p.abs));
        const batch = await buildBatch(pkg, pkgSrcPath, pkgDistPath, repoFilePaths);
        await mkdirBatch(batch);
        const { peggyConfigOutputPaths } = await pool.run(batch);

        if (
          pkg.manifest.id === '@kbn/ui-shared-deps-src' ||
          pkg.manifest.id === '@kbn/ui-shared-deps-npm'
        ) {
          await scanCopy({
            source: config.resolveFromRepo(
              'target',
              'build',
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
              'target',
              'build',
              pkg.normalizedRepoRelativeDir,
              'target_workers'
            ),
            destination: build.resolvePath(pkg.normalizedRepoRelativeDir, 'target_workers'),
            permissions: distPerms,
            filter: (rec) => rec.source.ext !== '.map',
          });
        }

        if (pkg.manifest.id === '@kbn/repo-packages') {
          await write(
            Path.resolve(pkgDistPath, 'package-map.json'),
            JSON.stringify(
              packages
                .filter((p) => p.isPlugin())
                .map((p) => [p.manifest.id, `node_modules/${p.manifest.id}`])
            )
          );
        }

        if (peggyConfigOutputPaths.length) {
          await deleteAll(peggyConfigOutputPaths, log);
        }

        if (pkg.isPlugin()) {
          await write(
            Path.resolve(pkgDistPath, 'kibana.jsonc'),
            JSON.stringify(
              {
                ...pkg.manifest,
                build: undefined,
                plugin: {
                  ...pkg.manifest.plugin,
                  __category__: pkg.getPluginCategories(),
                },
              },
              null,
              2
            )
          );
        }

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

        if (pkg.manifest.id === '@kbn/fleet-plugin') {
          await fleetBuildTasks(pkgDistPath, log, config);
        }

        log.info(`Copied`, pkg.manifest.id, 'into build');
      } catch (error) {
        error.message = `Failed to copy ${pkg.manifest.id} into the build: ${error.message}`;
        throw error;
      }
    });
  } finally {
    await pool.destroy();
  }
}
