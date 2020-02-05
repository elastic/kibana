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
import { createHash } from 'crypto';

import webpack, { Stats } from 'webpack';
import * as Rx from 'rxjs';
import { mergeMap, map, mapTo, takeUntil } from 'rxjs/operators';

import {
  CompilerMessages,
  WorkerMessages,
  maybeMap,
  parseWorkerConfig,
  Bundle,
  parseBundles,
  WorkerConfig,
  isWorkerMessage,
  WorkerMessage,
  ascending,
} from '../common';
import { getWebpackConfig } from './webpack.config';
import { isFailureStats, failedStatsToErrorMessage } from './webpack_helpers';
import {
  isExternalModule,
  isNormalModule,
  isIgnoredModule,
  isConcatenatedModule,
  WebpackNormalModule,
  getModulePath,
} from './webpack_helpers';

const PLUGIN_NAME = '@kbn/optimizer';
const workerMsgs = new WorkerMessages();
if (!process.send) {
  throw new Error('worker process was not started with an IPC channel');
}

const send = (msg: WorkerMessage) => {
  if (!process.send) {
    // parent is gone
    process.exit(0);
  } else {
    process.send(msg);
  }
};

// check for connected parent on an unref'd timer rather than listening
// to "disconnect" since that listner prevents the process from exiting
setInterval(() => {
  if (!process.connected) {
    // parent is gone
    process.exit(0);
  }
}, 1000).unref();

const runWorker = (workerConfig: WorkerConfig, bundles: Bundle[]) => {
  const multiCompiler = webpack(bundles.map(def => getWebpackConfig(def, workerConfig)));

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

const observeCompiler = (
  workerConfig: WorkerConfig,
  bundle: Bundle,
  compiler: webpack.Compiler
) => {
  const compilerMsgs = new CompilerMessages(bundle.id);
  const done$ = new Rx.Subject();
  const { beforeRun, watchRun, done } = compiler.hooks;

  /**
   * Called by webpack as a single run compilation is starting
   */
  const started$ = Rx.merge(
    Rx.fromEventPattern(cb => beforeRun.tap(PLUGIN_NAME, cb)),
    Rx.fromEventPattern(cb => watchRun.tap(PLUGIN_NAME, cb))
  ).pipe(mapTo(compilerMsgs.running()));

  /**
   * Called by webpack as any compilation is complete. If the
   * needAdditionalPass property is set then another compilation
   * is about to be started, so we shouldn't send complete quite yet
   */
  const complete$ = Rx.fromEventPattern<Stats>(cb => done.tap(PLUGIN_NAME, cb)).pipe(
    maybeMap(stats => {
      // @ts-ignore not included in types, but it is real https://github.com/webpack/webpack/blob/ab4fa8ddb3f433d286653cd6af7e3aad51168649/lib/Watching.js#L58
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

      const normalModules = stats.compilation.modules.filter(
        (module): module is WebpackNormalModule => {
          if (isNormalModule(module)) {
            return true;
          }

          if (isExternalModule(module) || isIgnoredModule(module) || isConcatenatedModule(module)) {
            return false;
          }

          throw new Error(`Unexpected module type: ${inspect(module)}`);
        }
      );

      const referencedFiles = new Set<string>();

      for (const module of normalModules) {
        const path = getModulePath(module);

        const parsedPath = Path.parse(path);
        const dirSegments = parsedPath.dir.split(Path.sep);
        if (!dirSegments.includes('node_modules')) {
          referencedFiles.add(path);
          continue;
        }

        const nmIndex = dirSegments.lastIndexOf('node_modules');
        const isScoped = dirSegments[nmIndex + 1].startsWith('@');
        referencedFiles.add(
          Path.join(
            parsedPath.root,
            ...dirSegments.slice(0, nmIndex + 1 + (isScoped ? 2 : 1)),
            'package.json'
          )
        );
      }

      const hashLines: string[] = [];
      for (const file of referencedFiles) {
        try {
          // don't worry, these are cached by webpack
          const stat = compiler.inputFileSystem.statSync(file);
          hashLines.push(`${file}:${stat.mtimeMs}`);
        } catch (error) {
          if (error?.code === 'ENOENT') {
            hashLines.push(`${file}:${undefined}`);
          } else {
            throw error;
          }
        }
      }

      bundle.cache.set({
        optimizerVersion: workerConfig.optimizerVersion,
        key: createHash('sha1')
          .update(hashLines.sort(ascending(l => l)).join('\n'))
          .digest('hex'),
        moduleCount: normalModules.length,
        files: Array.from(referencedFiles),
      });

      return compilerMsgs.compilerSuccess({
        moduleCount: normalModules.length,
      });
    })
  );

  /**
   * Called whenever the compilation results in an error that
   * prevets assets from being emitted, and prevents watching
   * from continuing.
   */
  const error$ = Rx.fromEventPattern<Error>(cb => compiler.hooks.failed.tap(PLUGIN_NAME, cb)).pipe(
    map(error => {
      throw compilerMsgs.error(error);
    })
  );

  /**
   * Merge events into a single stream, if we're not watching
   * complete the stream after our first complete$ event
   */
  return Rx.merge(started$, complete$, error$).pipe(takeUntil(done$));
};

const exit = (code: number) => {
  process.exitCode = code;
  setTimeout(() => {
    send(
      workerMsgs.error(
        new Error('process did not automatically exit within 5 seconds, forcing exit')
      )
    );
    process.exit(1);
  }, 5000).unref();
};

Rx.defer(() => {
  return Rx.of({
    workerConfig: parseWorkerConfig(process.argv[2]),
    bundles: parseBundles(process.argv[3]),
  });
})
  .pipe(mergeMap(({ workerConfig, bundles }) => runWorker(workerConfig, bundles)))
  .subscribe(
    msg => {
      send(msg);
    },
    error => {
      if (isWorkerMessage(error)) {
        send(error);
      } else {
        send(workerMsgs.error(error));
      }

      exit(1);
    },
    () => {
      exit(0);
    }
  );
