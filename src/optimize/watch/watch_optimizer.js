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

import * as Rx from 'rxjs';
import { mergeMap, take } from 'rxjs/operators';

import BaseOptimizer from '../base_optimizer';

import { createBundlesRoute } from '../bundles_route';

const STATUS = {
  RUNNING: 'optimizer running',
  SUCCESS: 'optimizer completed successfully',
  FAILURE: 'optimizer failed with stats',
  FATAL: 'optimizer failed without stats',
};

export default class WatchOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);
    this.log = opts.log || (() => null);
    this.prebuild = opts.prebuild || false;
    this.status$ = new Rx.ReplaySubject(1);
  }

  async init() {
    this.initializing = true;
    this.initialBuildComplete = false;

    // log status changes
    this.status$.subscribe(this.onStatusChangeHandler);

    await this.uiBundles.writeEntryFiles();
    await this.uiBundles.ensureStyleFiles();

    await super.init();

    this.compiler.hooks.watchRun.tapAsync(this.compilerWatchRunTap);
    this.compiler.hooks.done.tap(this.compilerDoneTap);
    this.compiler.watch({ aggregateTimeout: 200 }, this.compilerWatchErrorHandler);

    if (this.prebuild) {
      await this.onceBuildOutcome();
    }

    this.initializing = false;
  }

  bindToServer(server, basePath) {
    // pause all requests received while the compiler is running
    // and continue once an outcome is reached (aborting the request
    // with an error if it was a failure).
    server.ext('onRequest', (request, reply) => {
      this.onceBuildOutcome()
        .then(() => reply.continue())
        .catch(reply);
    });

    server.route(createBundlesRoute({
      bundlesPath: this.compiler.outputPath,
      basePublicPath: basePath
    }));
  }

  async onceBuildOutcome() {
    return await this.status$.pipe(
      mergeMap(this.mapStatusToOutcomes),
      take(1)
    )
      .toPromise();
  }

  mapStatusToOutcomes({ type, error }) {
    switch (type) {
      case STATUS.RUNNING:
        return [];

      case STATUS.SUCCESS:
        return [true];

      case STATUS.FAILURE:
      case STATUS.FATAL:
        return Rx.throwError(error);
    }
  }

  compilerWatchRunTap = {
    name: 'kibana-compilerWatchRunTap',
    fn: async (arg, cb) => {
      this.status$.next({
        type: STATUS.RUNNING
      });

      // await this.dllCompiler.run();
      cb();
    }
  }

  compilerDoneTap = {
    name: 'kibana-compilerDoneTap',
    fn: (stats) => {
      this.initialBuildComplete = true;
      const seconds = parseFloat((stats.endTime - stats.startTime) / 1000).toFixed(2);

      if (this.isFailure(stats)) {
        this.status$.next({
          type: STATUS.FAILURE,
          seconds,
          error: this.failedStatsToError(stats)
        });
      } else {
        this.status$.next({
          type: STATUS.SUCCESS,
          seconds,
        });
      }
    }
  }

  compilerWatchErrorHandler = (error) => {
    if (error) {
      this.status$.next({
        type: STATUS.FATAL,
        error
      });
    }
  }

  onStatusChangeHandler = ({ type, seconds, error }) => {
    switch (type) {
      case STATUS.RUNNING:
        if (!this.initialBuildComplete) {
          this.log(['info', 'optimize'], {
            tmpl: 'Optimization started',
            bundles: this.uiBundles.getIds()
          });
        }
        break;

      case STATUS.SUCCESS:
        this.log(['info', 'optimize'], {
          tmpl: 'Optimization <%= status %> in <%= seconds %> seconds',
          bundles: this.uiBundles.getIds(),
          status: 'success',
          seconds
        });
        break;

      case STATUS.FAILURE:
        // errors during initialization to the server, unlike the rest of the
        // errors produced here. Lets not muddy the console with extra errors
        if (!this.initializing) {
          this.log(['fatal', 'optimize'], {
            tmpl: 'Optimization <%= status %> in <%= seconds %> seconds<%= err %>',
            bundles: this.uiBundles.getIds(),
            status: 'failed',
            seconds,
            err: error
          });
        }
        break;

      case STATUS.FATAL:
        this.log('fatal', error);
        process.exit(1);
        break;
    }
  }
}
