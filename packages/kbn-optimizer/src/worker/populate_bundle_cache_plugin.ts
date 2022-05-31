/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';
import { inspect } from 'util';

import webpack from 'webpack';

import {
  Bundle,
  WorkerConfig,
  ascending,
  parseFilePath,
  Hashes,
  ParsedDllManifest,
} from '../common';
import { BundleRefModule } from './bundle_ref_module';
import {
  isExternalModule,
  isNormalModule,
  isIgnoredModule,
  isConcatenatedModule,
  isDelegatedModule,
  getModulePath,
} from './webpack_helpers';

/**
 * sass-loader creates about a 40% overhead on the overall optimizer runtime, and
 * so this constant is used to indicate to assignBundlesToWorkers() that there is
 * extra work done in a bundle that has a lot of scss imports. The value is
 * arbitrary and just intended to weigh the bundles so that they are distributed
 * across mulitple workers on machines with lots of cores.
 */
const EXTRA_SCSS_WORK_UNITS = 100;

const isBazelPackageCache = new Map<string, boolean>();
function isBazelPackage(pkgJsonPath: string) {
  const cached = isBazelPackageCache.get(pkgJsonPath);
  if (typeof cached === 'boolean') {
    return cached;
  }

  const path = parseFilePath(Fs.realpathSync(pkgJsonPath, 'utf-8'));
  const match = !!path.matchDirs('bazel-out', /-fastbuild$/, 'bin', 'packages');
  isBazelPackageCache.set(pkgJsonPath, match);

  return match;
}

export class PopulateBundleCachePlugin {
  constructor(
    private readonly workerConfig: WorkerConfig,
    private readonly bundle: Bundle,
    private readonly dllManifest: ParsedDllManifest
  ) {}

  public apply(compiler: webpack.Compiler) {
    const { bundle, workerConfig } = this;

    compiler.hooks.emit.tap(
      {
        name: 'PopulateBundleCachePlugin',
        before: ['BundleMetricsPlugin'],
      },
      (compilation) => {
        const bundleRefExportIds: string[] = [];
        let moduleCount = 0;
        let workUnits = compilation.fileDependencies.size;

        const paths = new Set<string>();
        const rawHashes = new Map<string, string | null>();
        const addReferenced = (path: string) => {
          if (paths.has(path)) {
            return;
          }

          paths.add(path);
          let content: Buffer;
          try {
            content = compiler.inputFileSystem.readFileSync(path);
          } catch {
            return rawHashes.set(path, null);
          }

          return rawHashes.set(path, Hashes.hash(content));
        };

        const dllRefKeys = new Set<string>();

        if (bundle.manifestPath) {
          addReferenced(bundle.manifestPath);
        }

        for (const module of compilation.modules) {
          if (isNormalModule(module)) {
            moduleCount += 1;
            let path = getModulePath(module);
            let parsedPath = parseFilePath(path);

            const bazelOutIndex = parsedPath.dirs.indexOf('bazel-out');
            if (bazelOutIndex >= 0) {
              path = Path.resolve(
                this.workerConfig.repoRoot,
                ...parsedPath.dirs.slice(bazelOutIndex),
                parsedPath.filename ?? ''
              );
              parsedPath = parseFilePath(path);
            }

            if (!parsedPath.dirs.includes('node_modules')) {
              addReferenced(path);

              if (path.endsWith('.scss')) {
                workUnits += EXTRA_SCSS_WORK_UNITS;

                for (const depPath of module.buildInfo.fileDependencies) {
                  addReferenced(depPath);
                }
              }

              continue;
            }

            const nmIndex = parsedPath.dirs.lastIndexOf('node_modules');
            const isScoped = parsedPath.dirs[nmIndex + 1].startsWith('@');
            const pkgJsonPath = Path.join(
              parsedPath.root,
              ...parsedPath.dirs.slice(0, nmIndex + 1 + (isScoped ? 2 : 1)),
              'package.json'
            );

            addReferenced(isBazelPackage(pkgJsonPath) ? path : pkgJsonPath);
            continue;
          }

          if (module instanceof BundleRefModule) {
            bundleRefExportIds.push(module.ref.exportId);
            continue;
          }

          if (isConcatenatedModule(module)) {
            moduleCount += module.modules.length;
            continue;
          }

          if (isDelegatedModule(module)) {
            // delegated modules are the references to the ui-shared-deps-npm dll
            dllRefKeys.add(module.userRequest);
            continue;
          }

          if (isExternalModule(module) || isIgnoredModule(module)) {
            continue;
          }

          throw new Error(`Unexpected module type: ${inspect(module)}`);
        }

        const referencedPaths = Array.from(paths).sort(ascending((p) => p));
        const sortedDllRefKeys = Array.from(dllRefKeys).sort(ascending((p) => p));

        bundle.cache.set({
          bundleRefExportIds: bundleRefExportIds.sort(ascending((p) => p)),
          optimizerCacheKey: workerConfig.optimizerCacheKey,
          cacheKey: bundle.createCacheKey(
            referencedPaths,
            new Hashes(rawHashes),
            this.dllManifest,
            sortedDllRefKeys
          ),
          moduleCount,
          workUnits,
          referencedPaths,
          dllRefKeys: sortedDllRefKeys,
        });

        // write the cache to the compilation so that it isn't cleaned by clean-webpack-plugin
        bundle.cache.writeWebpackAsset(compilation);
      }
    );
  }
}
