let _ = require('lodash');
let webpack = require('webpack');

let BaseOptimizer = require('./BaseOptimizer');

const STATUS_BUNDLE_INVALID = 'bundle invalid';
const STATUS_BUNDLING = 'optimizing';
const STATUS_REBUNDLING = 'bundle invalid during optimizing';
const STATUS_ERROR = 'error';
const STATUS_DONE = 'done';

class WatchingOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);

    this.bundleStatus = null;
    _.bindAll(this, 'init', 'setupCompiler', 'onBundlesInvalid', 'setStatus', 'enable', 'disable');

    this.run = this.enable; // enable makes a bit more sense here, but alias for consistency with CachedOptimizer
  }

  init(autoEnable) {
    return this.bundles.ensureAllEntriesExist(true).then(autoEnable ? this.enable : this.setupCompiler);
  }

  setupCompiler(autoEnable) {
    if (!_.size(this.bundles.entries)) return;

    this.compilerConfig = this.getConfig();
    this.compiler = webpack(this.compilerConfig);
    this.compiler.plugin('watch-run', _.partial(this.setStatus, STATUS_BUNDLING));
    this.compiler.plugin('invalid', this.onBundlesInvalid);
    this.compiler.plugin('failed', _.partial(this.setStatus, STATUS_ERROR));
    this.compiler.plugin('done', _.partial(this.setStatus, STATUS_DONE));

    if (autoEnable) this.enable();
  }

  onBundlesInvalid() {
    switch (this.bundleStatus || null) {
      case STATUS_BUNDLING:
      case STATUS_REBUNDLING:
        // if the source changed during building, we immediately rebuild
        return this.setStatus(STATUS_REBUNDLING);
      case null:
        // the bundle has to be something before that something can be invalid
        return;
      default:
        return this.setStatus(STATUS_BUNDLE_INVALID);
    }
  }

  setStatus(status) {
    let self = this;
    let entries = self.bundles.entries;
    let stats;
    let error;
    let shouldBeFinal = false;

    switch (status) {
      case 'done':
        stats = self.watcher.stats;
        error = null;
        shouldBeFinal = true;

        if (stats.hasErrors()) {
          error = new Error('Optimization must not produce errors or warnings');
          status = 'error';
        }
        break;

      case 'error':
        stats = self.watcher.stats;
        error = self.watcher.error;
    }

    let apply = function () {
      clearTimeout(self.tentativeStatusChange);
      self.tentativeStatusChange = null;
      self.emit(self.bundleStatus = status, entries, stats, error);
    };

    if (shouldBeFinal) {
      // this looks race-y, but it's how webpack does it: https://goo.gl/ShVo2o
      self.tentativeStatusChange = setTimeout(apply, 0);
    } else {
      apply();
    }

    // webpack allows some plugins to be async, we don't want to hold up webpack,
    // so just always callback if we get a cb();
    let cb = _.last(arguments);
    if (typeof cb === 'function') cb();
  }

  enable() {
    if (!this.compiler) {
      return this.setupCompiler(true);
    }

    if (this.watcher) {
      throw new Error('WatchingOptimizer already watching!');
    }

    this.watcher = this.compiler.watch({}, _.noop);
  }

  disable() {
    if (!this.compiler) return;
    if (!this.watcher) return;

    this.watcher.close();
    this.watcher = null;
    this.compiler = null;
  }
}

module.exports = WatchingOptimizer;
