/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { inspect, promisify } from 'util';

import webpack from 'webpack';
import {
  isExternalModule,
  isNormalModule,
  isIgnoredModule,
  isConcatenatedModule,
  isDelegatedModule,
  isRuntimeModule,
} from '@kbn/optimizer-webpack-helpers';

import {
  Bundle,
  WorkerConfig,
  ascending,
  parseFilePath,
  Hashes,
  ParsedDllManifest,
} from '../common';
import { BundleRemoteModule } from './bundle_remote_module';

interface InputFileSystem {
  readFile: (
    path: string,
    encoding: null | undefined,
    callback: (err: Error | null, stats: Buffer) => void
  ) => void;
  stat: (path: string, callback: (err: Error | null, stats: Fs.Stats) => void) => void;
}

/**
 * sass-loader creates about a 40% overhead on the overall optimizer runtime, and
 * so this constant is used to indicate to assignBundlesToWorkers() that there is
 * extra work done in a bundle that has a lot of scss imports. The value is
 * arbitrary and just intended to weigh the bundles so that they are distributed
 * across mulitple workers on machines with lots of cores.
 */
const EXTRA_SCSS_WORK_UNITS = 100;

export class PopulateBundleCachePlugin {
  constructor(
    private readonly workerConfig: WorkerConfig,
    private readonly bundle: Bundle,
    private readonly dllManifest: ParsedDllManifest
  ) {}

  public apply(compiler: webpack.Compiler) {
    const { bundle, workerConfig } = this;
    const inputFs = compiler.inputFileSystem as InputFileSystem;
    if (!inputFs) {
      throw new Error('expected inputFs to be defined');
    }
    const readFile = promisify(inputFs.readFile);
    const stat = promisify(inputFs.stat);

    compiler.hooks.compilation.tap('PopulateBundleCachePlugin', (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'PopulateBundleCachePlugin',
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
        },
        async (_, callback) => {
          const bundleRefExportIds: string[] = [];
          let moduleCount = 0;
          let workUnits = compilation.fileDependencies.size;

          const paths = new Set<string>();
          const rawHashes = new Map<string, string | null>();
          const addReferenced = async (path: string) => {
            if (paths.has(path)) {
              return;
            }

            paths.add(path);
            let content: Buffer;
            try {
              content = await readFile(path, null);
            } catch {
              return rawHashes.set(path, null);
            }

            return rawHashes.set(path, Hashes.hash(content));
          };

          const dllRefKeys = new Set<string>();

          if (bundle.manifestPath) {
            await addReferenced(bundle.manifestPath);
          }

          // add all files from the fileDependencies (which includes a bunch of directories) to the cache
          for (const path of compilation.fileDependencies) {
            const cStat = await stat(path);
            if (!cStat.isFile()) {
              continue;
            }

            await addReferenced(path);
            if (path.endsWith('.scss')) {
              workUnits += EXTRA_SCSS_WORK_UNITS;
              continue;
            }

            const parsedPath = parseFilePath(path);
            if (!parsedPath.dirs.includes('node_modules')) {
              continue;
            }

            const nmIndex = parsedPath.dirs.lastIndexOf('node_modules');
            const isScoped = parsedPath.dirs[nmIndex + 1].startsWith('@');
            const pkgJsonPath = Path.join(
              parsedPath.root,
              ...parsedPath.dirs.slice(0, nmIndex + 1 + (isScoped ? 2 : 1)),
              'package.json'
            );
            await addReferenced(pkgJsonPath);
            continue;
          }

          for (const module of compilation.modules) {
            if (isNormalModule(module)) {
              moduleCount += 1;
              continue;
            }

            if (module instanceof BundleRemoteModule) {
              bundleRefExportIds.push(module.req.full);
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

            if (isExternalModule(module) || isIgnoredModule(module) || isRuntimeModule(module)) {
              continue;
            }

            throw new Error(`Unexpected module type: ${inspect(module)}`);
          }

          const referencedPaths = Array.from(paths).sort(ascending((p) => p));
          const sortedDllRefKeys = Array.from(dllRefKeys).sort(ascending((p) => p));

          bundle.cache.set({
            remoteBundleImportReqs: bundleRefExportIds.sort(ascending((p) => p)),
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

          callback();
        }
      );
    });
  }
}
