module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var resolve = require('path').resolve;
  var fromRoot = require('../../utils/fromRoot');

  var Optimizer = require('./Optimizer');
  var bundleDir = resolve(config.get('optimize.bundleDir'));
  var status = kbnServer.status.create('optimize');

  server.exposeStaticDir('/bundles/{path*}', bundleDir);
  if (config.get('optimize.sourceMaps')) {
    server.exposeStaticDir('/src/{path*}', fromRoot('src'));
    server.exposeStaticDir('/node_modules/{paths*}', fromRoot('node_modules'));
  }

  return (new Optimizer({
    watch: config.get('optimize.watch'),
    sourceMaps: config.get('optimize.sourceMaps'),
    bundleDir: bundleDir,
    apps: [].concat(
      kbnServer.uiExports.apps,
      kbnServer.uiExports.apps.hidden
    ),
    plugins: kbnServer.plugins
  }))
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
};
