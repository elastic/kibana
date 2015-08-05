module.exports = function (kbnServer, server, config) {
  if (!config.get('optimize.enabled')) return;

  var _ = require('lodash');
  var { resolve } = require('path');
  var fromRoot = require('../utils/fromRoot');

  var CachedOptimizer = require('./CachedOptimizer');
  var WatchingOptimizer = require('./WatchingOptimizer');

  var bundleDir = resolve(config.get('optimize.bundleDir'));
  var status = kbnServer.status.create('optimize');

  server.exposeStaticDir('/bundles/{path*}', bundleDir);

  function logStats(tag, stats) {
    if (config.get('logging.json')) {
      server.log(['optimize', tag], _.pick(stats.toJson(), 'errors', 'warnings'));
    } else {
      server.log(['optimize', tag], `\n${ stats.toString({ colors: true }) }`);
    }
  }

  function describeEntries(entries) {
    let ids = _.pluck(entries, 'id').join('", "');
    return `application${ entries.length === 1 ? '' : 's'} "${ids}"`;
  }

  function onMessage(handle, filter) {
    filter = filter || _.constant(true);
    process.on('message', function (msg) {
      var optimizeMsg = msg && msg.optimizeMsg;
      if (!optimizeMsg || !filter(optimizeMsg)) return;
      handle(optimizeMsg);
    });
  }

  var role = config.get('optimize._workerRole');
  if (role === 'receive') {
    // query for initial status
    process.send(['WORKER_BROADCAST', { optimizeMsg: '?' }]);
    onMessage(function (wrkrStatus) {
      status[wrkrStatus.state](wrkrStatus.message);
    });
  }

  if (role === 'send') {
    let send = function () {
      process.send(['WORKER_BROADCAST', { optimizeMsg: status }]);
    };

    status.on('change', send);
    onMessage(send, _.partial(_.eq, '?'));
    send();
  }

  let watching = config.get('optimize.watch');
  let Optimizer = watching ? WatchingOptimizer : CachedOptimizer;
  let optmzr = kbnServer.optimizer = new Optimizer({
    sourceMaps: config.get('optimize.sourceMaps'),
    bundleDir: bundleDir,
    entries: _.map(kbnServer.uiExports.allApps(), function (app) {
      return {
        id: app.id,
        deps: app.getRelatedPlugins(),
        modules: app.getModules()
      };
    }),
    plugins: kbnServer.plugins
  });

  server.on('close', _.bindKey(optmzr.disable || _.noop, optmzr));

  kbnServer.mixin(require('./browserTests'))
  .then(function () {

    if (role === 'receive') return;

    optmzr.on('bundle invalid', function () {
      status.yellow('Source file change detected, reoptimizing source files');
    });

    optmzr.on('done', function (entries, stats) {
      logStats('debug', stats);
      status.green(`Optimization of ${describeEntries(entries)} complete`);
    });

    optmzr.on('error', function (entries, stats, err) {
      if (stats) logStats('fatal', stats);
      status.red('Optimization failure! ' + err.message);
    });

    return optmzr.init()
    .then(function () {
      let entries = optmzr.bundles.getMissingEntries();
      if (!entries.length) {
        if (watching) {
          status.red('No optimizable applications found');
        } else {
          status.green('Reusing previously cached application source files');
        }
        return;
      }

      if (watching) {
        status.yellow(`Optimizing and watching all application source files`);
      } else {
        status.yellow(`Optimizing and caching ${describeEntries(entries)}`);
      }

      optmzr.run();
      return null;
    });
  });
};
