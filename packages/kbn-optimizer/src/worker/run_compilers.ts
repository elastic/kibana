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

import 'source-map-support/register';

import Fs from 'fs';
import Path from 'path';
import { inspect } from 'util';

import webpack, { Stats } from 'webpack';
import * as Rx from 'rxjs';
import { mergeMap, map, mapTo, takeUntil } from 'rxjs/operators';

import {
  CompilerMsgs,
  CompilerMsg,
  maybeMap,
  Bundle,
  WorkerConfig,
  ascending,
  parseFilePath,
  BundleRefs,
} from '../common';
import { BundleRefModule } from './bundle_ref_module';
import { getWebpackConfig } from './webpack.config';
import { isFailureStats, failedStatsToErrorMessage } from './webpack_helpers';
import {
  isExternalModule,
  isNormalModule,
  isIgnoredModule,
  isConcatenatedModule,
  getModulePath,
} from './webpack_helpers';

const PLUGIN_NAME = '@kbn/optimizer';

/**
 * Create an Observable<CompilerMsg> for a specific child compiler + bundle
 */
const observeCompiler = (
  workerConfig: WorkerConfig,
  bundle: Bundle,
  compiler: webpack.Compiler
): Rx.Observable<CompilerMsg> => {
  const compilerMsgs = new CompilerMsgs(bundle.id);
  const done$ = new Rx.Subject();
  const { beforeRun, watchRun, done } = compiler.hooks;

  /**
   * Called by webpack as a single run compilation is starting
   */
  const started$ = Rx.merge(
    Rx.fromEventPattern((cb) => beforeRun.tap(PLUGIN_NAME, cb)),
    Rx.fromEventPattern((cb) => watchRun.tap(PLUGIN_NAME, cb))
  ).pipe(mapTo(compilerMsgs.running()));

  /**
   * Called by webpack as any compilation is complete. If the
   * needAdditionalPass property is set then another compilation
   * is about to be started, so we shouldn't send complete quite yet
   */
  const complete$ = Rx.fromEventPattern<Stats>((cb) => done.tap(PLUGIN_NAME, cb)).pipe(
    maybeMap((stats) => {
      // @ts-expect-error not included in types, but it is real https://github.com/webpack/webpack/blob/ab4fa8ddb3f433d286653cd6af7e3aad51168649/lib/Watching.js#L58
      if (stats.compilation.needAdditionalPass) {
        return undefined;
      }

      if (workerConfig.profileWebpack) {
        Fs.writeFileSync(
          Path.resolve(bundle.outputDir, 'stats.json'),
          JSON.stringify(stats.toJson())
        );
      }

      if (!workerConfig.watch) {
        process.nextTick(() => done$.next());
      }

      if (isFailureStats(stats)) {
        return compilerMsgs.compilerFailure({
          failure: failedStatsToErrorMessage(stats),
        });
      }

      const bundleRefExportIds: string[] = [];
      const referencedFiles = new Set<string>();
      let normalModuleCount = 0;

      for (const module of stats.compilation.modules) {
        if (isNormalModule(module)) {
          normalModuleCount += 1;
          const path = getModulePath(module);
          const parsedPath = parseFilePath(path);

          if (!parsedPath.dirs.includes('node_modules')) {
            referencedFiles.add(path);
            continue;
          }

          const nmIndex = parsedPath.dirs.lastIndexOf('node_modules');
          const isScoped = parsedPath.dirs[nmIndex + 1].startsWith('@');
          referencedFiles.add(
            Path.join(
              parsedPath.root,
              ...parsedPath.dirs.slice(0, nmIndex + 1 + (isScoped ? 2 : 1)),
              'package.json'
            )
          );
          continue;
        }

        if (module instanceof BundleRefModule) {
          bundleRefExportIds.push(module.exportId);
          continue;
        }

        if (isExternalModule(module) || isIgnoredModule(module) || isConcatenatedModule(module)) {
          continue;
        }

        throw new Error(`Unexpected module type: ${inspect(module)}`);
      }

      const files = Array.from(referencedFiles).sort(ascending((p) => p));
      const mtimes = new Map(
        files.map((path): [string, number | undefined] => {
          try {
            return [path, compiler.inputFileSystem.statSync(path)?.mtimeMs];
          } catch (error) {
            if (error?.code === 'ENOENT') {
              return [path, undefined];
            }

            throw error;
          }
        })
      );

      bundle.cache.set({
        bundleRefExportIds,
        optimizerCacheKey: workerConfig.optimizerCacheKey,
        cacheKey: bundle.createCacheKey(files, mtimes),
        moduleCount: normalModuleCount,
        files,
      });

      return compilerMsgs.compilerSuccess({
        moduleCount: normalModuleCount,
      });
    })
  );

  /**
   * Called whenever the compilation results in an error that
   * prevets assets from being emitted, and prevents watching
   * from continuing.
   */
  const error$ = Rx.fromEventPattern<Error>((cb) =>
    compiler.hooks.failed.tap(PLUGIN_NAME, cb)
  ).pipe(
    map((error) => {
      throw compilerMsgs.error(error);
    })
  );

  /**
   * Merge events into a single stream, if we're not watching
   * complete the stream after our first complete$ event
   */
  return Rx.merge(started$, complete$, error$).pipe(takeUntil(done$));
};

/**
 * Run webpack compilers
 */
export const runCompilers = (
  workerConfig: WorkerConfig,
  bundles: Bundle[],
  bundleRefs: BundleRefs
) => {
  const multiCompiler = webpack(
    bundles.map((def) => getWebpackConfig(def, bundleRefs, workerConfig))
  );

  return Rx.merge(
    /**
     * convert each compiler into an event stream that represents
     * the status of each compiler, if we aren't watching the streams
     * will complete after the compilers are complete.
     *
     * If a significant error occurs the stream will error
     */
    Rx.from(multiCompiler.compilers.entries()).pipe(
      mergeMap(([compilerIndex, compiler]) => {
        const bundle = bundles[compilerIndex];
        return observeCompiler(workerConfig, bundle, compiler);
      })
    ),

    /**
     * compilers have been hooked up for their events, trigger run()/watch()
     */
    Rx.defer(() => {
      if (!workerConfig.watch) {
        multiCompiler.run(() => {});
      } else {
        multiCompiler.watch({}, () => {});
      }

      return [];
    })
  );
};
