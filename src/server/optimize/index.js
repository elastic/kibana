'use strict';

module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var resolve = require('path').resolve;
  var fromRoot = require('../../utils/fromRoot');

  var Optimizer = require('./Optimizer');
  var bundleDir = resolve(config.get('optimize.bundleDir'));
  var status = kbnServer.status.create('optimize');

  server.exposeStaticDir('/bundles/{path*}', bundleDir);

  server.ext('onRequest', function (request, reply) {
    switch (status.state) {
    case 'yellow':
      return reply(`
        <html>
          <head><meta http-equiv="refresh" content="1"></head>
          <body>${status.message}</body>
        </html>
      `);
    case 'red':
      return reply(`
        <html><body>${status.message}, please wait.</body></html>
      `);
    default:
      return reply.continue();
    }
  });

  function start() {
    kbnServer.optimizer = new Optimizer({
      watch: config.get('optimize.watch'),
      sourceMaps: config.get('optimize.sourceMaps'),
      bundleDir: bundleDir,
      apps: [].concat(
        kbnServer.uiExports.apps,
        kbnServer.uiExports.apps.hidden
      ),
      plugins: kbnServer.plugins
    });

    kbnServer.optimizer
    .on('build-start', function () {
      status.yellow('Optimizing and caching application source files');
    })
    .on('watch-run', _.before(2, function () {
      status.yellow('Optimizing and watching application source files');
    }))
    .on('watch-run', _.after(2, function () {
      status.yellow('Source file change detected, reoptimizing source files');
    }))
    .on('done', function (stats) {
      server.log(['optimize', 'debug'], `\n${ stats.toString({ colors: true }) }`);
      status.green('Optimization complete');
    })
    .on('error', function (stats, err) {
      server.log(['optimize', 'fatal'], `\n${ stats.toString({ colors: true }) }`);
      status.red('Optimization failure! ' + err.message);
    })
    .init();
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

  if (!role || role === 'send') {
    start();
  }
};
