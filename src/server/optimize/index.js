module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var resolve = require('path').resolve;
  var join = require('path').join;

  var Optimizer = require('./Optimizer');
  var bundleDir = resolve(config.get('optimize.bundleDir'));
  var status = kbnServer.status.create('optimize');

  server.exposeStaticDir('/bundles/{path*}', bundleDir);

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
  .on('done', function () {
    status.green('Optimization complete');
  })
  .on('error', function (err) {
    server.log('fatal', err);
    status.red('Optimization failure! ' + err.message);
  })
  .init();
};
