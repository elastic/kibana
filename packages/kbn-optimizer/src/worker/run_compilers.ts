/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'source-map-support/register';

import webpack, { Stats } from 'webpack';
import * as Rx from 'rxjs';
import { mergeMap, map, mapTo, takeUntil } from 'rxjs';
import { isFailureStats, failedStatsToErrorMessage } from '@kbn/optimizer-webpack-helpers';

import {
  CompilerMsgs,
  CompilerMsg,
  maybeMap,
  Bundle,
  WorkerConfig,
  BundleRemotes,
} from '../common';
import { getWebpackConfig } from './webpack.config';

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
  const done$ = new Rx.Subject<void>();
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
      if (stats.compilation.needAdditionalPass) {
        return undefined;
      }

      if (!workerConfig.watch) {
        process.nextTick(() => done$.next());
      }

      if (isFailureStats(stats)) {
        return compilerMsgs.compilerFailure({
          failure: failedStatsToErrorMessage(stats),
        });
      }

      const moduleCount = bundle.cache.getModuleCount();
      if (moduleCount === undefined) {
        throw new Error(`moduleCount wasn't populated by PopulateBundleCachePlugin`);
      }

      return compilerMsgs.compilerSuccess({
        moduleCount,
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
  bundleRemotes: BundleRemotes
) => {
  const multiCompiler = webpack(
    bundles.map((def) => getWebpackConfig(def, bundleRemotes, workerConfig))
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
