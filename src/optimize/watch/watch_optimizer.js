import { Observable, ReplaySubject } from 'rxjs';

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
    this.status$ = new ReplaySubject(1);
  }

  async init() {
    this.initializing = true;
    this.initialBuildComplete = false;

    // log status changes
    this.status$.subscribe(this.onStatusChangeHandler);

    await this.uiBundles.writeEntryFiles();
    await this.uiBundles.ensureStyleFiles();

    await this.initCompiler();

    this.compiler.plugin('watch-run', this.compilerRunStartHandler);
    this.compiler.plugin('done', this.compilerDoneHandler);
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
    return await this.status$
      .mergeMap(this.mapStatusToOutcomes)
      .take(1)
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
        return Observable.throw(error);
    }
  }

  compilerRunStartHandler = (watchingCompiler, cb) => {
    this.status$.next({
      type: STATUS.RUNNING
    });

    cb();
  }

  compilerWatchErrorHandler = (error) => {
    if (error) {
      this.status$.next({
        type: STATUS.FATAL,
        error
      });
    }
  }

  compilerDoneHandler = (stats) => {
    this.initialBuildComplete = true;
    const seconds = parseFloat((stats.endTime - stats.startTime) / 1000).toFixed(2);

    if (stats.hasErrors() || stats.hasWarnings()) {
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
