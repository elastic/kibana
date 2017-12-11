import BaseOptimizer from '../base_optimizer';
import WeirdControlFlow from './weird_control_flow';
import { once } from 'lodash';
import { join } from 'path';

import { createBundlesRoute } from '../bundles_route';

export default class LazyOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);
    this.log = opts.log || (() => null);
    this.prebuild = opts.prebuild || false;

    this.timer = {
      ms: null,
      start: () => this.timer.ms = Date.now(),
      end: () => this.timer.ms = ((Date.now() - this.timer.ms) / 1000).toFixed(2)
    };

    this.build = new WeirdControlFlow();
  }

  async init() {
    this.initializing = true;

    await this.uiBundles.writeEntryFiles();
    await this.initCompiler();

    this.compiler.plugin('watch-run', (w, webpackCb) => {
      this.build.work(once(() => {
        this.timer.start();
        this.logRunStart();
        webpackCb();
      }));
    });

    this.compiler.plugin('done', stats => {
      if (!stats.hasErrors() && !stats.hasWarnings()) {
        this.logRunSuccess();
        this.build.success();
        return;
      }

      const err = this.failedStatsToError(stats);
      this.logRunFailure(err);
      this.build.failure(err);
      this.watching.invalidate();
    });

    this.watching = this.compiler.watch({ aggregateTimeout: 200 }, err => {
      if (err) {
        this.log('fatal', err);
        process.exit(1);
      }
    });

    const buildPromise = this.build.get();
    if (this.prebuild) await buildPromise;

    this.initializing = false;
    this.log(['info', 'optimize'], {
      tmpl: `Lazy optimization of ${this.uiBundles.getDescription()} ready`,
      bundles: this.uiBundles.getIds()
    });
  }

  async getPath(relativePath) {
    await this.build.get();
    return join(this.compiler.outputPath, relativePath);
  }

  bindToServer(server, basePath) {

    // calling `build.get()` resolves when the build is
    // "stable" (the compiler is not running) so this pauses
    // all requests received while the compiler is running
    // and lets the continue once it is done.
    server.ext('onRequest', (request, reply) => {
      this.build.get()
        .then(() => reply.continue())
        .catch(reply);
    });

    server.route(createBundlesRoute({
      bundlesPath: this.compiler.outputPath,
      basePublicPath: basePath
    }));
  }

  logRunStart() {
    this.log(['info', 'optimize'], {
      tmpl: `Lazy optimization started`,
      bundles: this.uiBundles.getIds()
    });
  }

  logRunSuccess() {
    this.log(['info', 'optimize'], {
      tmpl: 'Lazy optimization <%= status %> in <%= seconds %> seconds',
      bundles: this.uiBundles.getIds(),
      status: 'success',
      seconds: this.timer.end()
    });
  }

  logRunFailure(err) {
    // errors during initialization to the server, unlike the rest of the
    // errors produced here. Lets not muddy the console with extra errors
    if (this.initializing) return;

    this.log(['fatal', 'optimize'], {
      tmpl: 'Lazy optimization <%= status %> in <%= seconds %> seconds<%= err %>',
      bundles: this.uiBundles.getIds(),
      status: 'failed',
      seconds: this.timer.end(),
      err: err
    });
  }
}
