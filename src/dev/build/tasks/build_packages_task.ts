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
import { makeMatcher } from '@kbn/picomatcher';
import { PackageFileMap } from '@kbn/repo-file-maps';
import { getRepoFiles } from '@kbn/get-repo-files';

import { Task, scanCopy, write, deleteAll } from '../lib';
import type { Record } from '../lib/fs_records';
import { fleetBuildTasks } from './fleet';

const distPerms = (rec: Record) => (rec.type === 'file' ? 0o644 : 0o755);

/**
 * exclude files from packages by their whole name
 */
function excludeFileByName(name: string) {
  return (
    name === 'package.json' ||
    name === 'tsconfig.json' ||
    name === '.gitignore' ||
    name === 'webpack.config.js' ||
    name.endsWith('.d.ts')
  );
}

/**
 * exclude files from packages by their "tags" or basename without the extension
 * (We split the filename on "." and check every segment except for the last one
 */
function excludeFileByTags(tags: readonly string[]) {
  return tags.some(
    (t) =>
      t === 'mock' ||
      t === 'mocks' ||
      t === 'test' ||
      t === 'tests' ||
      t === 'story' ||
      t === 'stories' ||
      t === 'jest' ||
      t === 'README' ||
      t === 'readme' ||
      t === 'test_setup' ||
      t === 'jest_setup'
  );
}

/**
 * exclude directories from packages by their relative path (relative to the package root)
 */
function excludeDirsByRel(rel: string) {
  return rel === 'scripts';
}

/**
 * exclude directories from packages by their names, any directory in the package with
 * these names will be excluded
 */
function excludeDirsByName(name: string) {
  return (
    name === '__fixtures__' ||
    name === '__jest__' ||
    name === '__mocks__' ||
    name === '__snapshots__' ||
    name === '__tests__' ||
    name === 'cypress' ||
    name === 'dev_docs' ||
    name === 'docs' ||
    name === 'e2e' ||
    name === 'fixtures' ||
    name === 'ftr_e2e' ||
    name === 'integration_tests' ||
    name === 'manual_tests' ||
    name === 'mock_responses' ||
    name === 'mocks' ||
    name === 'mocks' ||
    name === '.storybook' ||
    name === 'storybook' ||
    name === 'target' ||
    name === 'test_data' ||
    name === 'test_fixtures' ||
    name === 'test_helpers' ||
    name === 'test_resources' ||
    name === 'test' ||
    name === 'tests'
  );
}

export const BuildPackages: Task = {
  description: 'Building distributable versions of Bazel packages',
  async run(config, log, build) {
    const packages = config.getDistPackagesFromRepo();
    const pkgFileMap = new PackageFileMap(packages, await getRepoFiles());

    log.info(`Building Bazel artifacts which are necessary for the build`);
    await runBazel(
      [
        'build',
        '//packages/kbn-ui-shared-deps-npm:shared_built_assets',
        '//packages/kbn-ui-shared-deps-src:shared_built_assets',
        '//packages/kbn-monaco:target_workers',
        '--show_result=1',
        '--define=dist=true',
      ],
      {
        logPrefix: '   │     ',
      }
    );

    const transformConfig: TransformConfig = {
      disableSourceMaps: true,
    };

    await withFastAsyncTransform(transformConfig, async (transform) => {
      await asyncForEach(packages, async (pkg) => {
        const allPaths = new Set(Array.from(pkgFileMap.getFiles(pkg), (p) => p.abs));
        const pkgDistPath = build.resolvePath(pkg.normalizedRepoRelativeDir);
        const peggyConfigOutputPaths = new Set<string>();
        const pkgSrcPath = config.resolveFromRepo(pkg.normalizedRepoRelativeDir);

        const matchExtraExcludes = pkg.manifest.build?.extraExcludes
          ? makeMatcher(pkg.manifest.build.extraExcludes)
          : false;
        const matchNoParse = pkg.manifest.build?.noParse
          ? makeMatcher(pkg.manifest.build.noParse)
          : false;

        log.verbose(`starting copy of ${pkg.manifest.id}`);

        try {
          // copy the built npm_module target dir into the build, package.json is updated to copy
          // the sources we actually end up using into the node_modules directory when we run
          // yarn install
          await scanCopy({
            source: pkgSrcPath,
            destination: pkgDistPath,
            permissions: distPerms,
            filter: (rec) => {
              // exclude any file which isn't checked into the repo
              if (rec.type === 'file' && !allPaths.has(rec.source.abs)) {
                return false;
              }

              if (rec.type === 'dir') {
                if (excludeDirsByName(rec.source.name) || excludeDirsByRel(rec.source.rel)) {
                  return false;
                }
              } else {
                if (!pkg.isPlugin && rec.source.name === 'kibana.jsonc') {
                  return false;
                }

                if (excludeFileByName(rec.source.name) || excludeFileByTags(rec.source.tags)) {
                  return false;
                }
              }

              // ignore files selected by the package's "build.extraExcludes" config
              if (matchExtraExcludes && matchExtraExcludes(rec.source.rel)) {
                return false;
              }

              return true;
            },
            async map(rec) {
              // never transpile files which are selected by the package's "build.noParse" config
              if (matchNoParse && matchNoParse(rec.source.rel)) {
                return;
              }

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

          if (pkg.manifest.id === '@kbn/repo-packages') {
            // rewrite package map to point into node_modules
            await write(
              Path.resolve(pkgDistPath, 'package-map.json'),
              JSON.stringify(
                packages
                  .filter((p) => p.isPlugin())
                  .map((p) => [p.manifest.id, `node_modules/${p.manifest.id}`])
              )
            );
          }

          // cleanup any peggy config files
          if (peggyConfigOutputPaths.size) {
            await deleteAll(Array.from(peggyConfigOutputPaths), log);
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
            // run fleet-specific build tasks
            await fleetBuildTasks(pkgDistPath, log, config);
          }

          log.info(`Copied`, pkg.manifest.id, 'into build');
        } catch (error) {
          error.message = `Failed to copy ${pkg.manifest.id} into the build: ${error.message}`;
          throw error;
        }
      });
    });
  },
};
