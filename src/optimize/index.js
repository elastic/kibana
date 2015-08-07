module.exports = async (kbnServer, server, config) => {
  if (!config.get('optimize.enabled')) return;

  // the lazy optimizer sets up two threads, one is the server listening
  // on 5601 and the other is a server listening on 5602 that builds the
  // bundles in a "middleware" style.
  //
  // the server listening on 5601 may be restarted a number of times, depending
  // on the watch setup managed by the cli. It proxies all bundles/* requests to
  // the other server. The server on 5602 is long running, in order to prevent
  // complete rebuilds of the optimize content.
  let lazy = config.get('optimize.lazy');
  if (lazy) {
    return await kbnServer.mixin(require('./lazy/lazy'));
  }

  let bundles = kbnServer.bundles;
  server.exposeStaticDir('/bundles/{path*}', bundles.env.workingDir);
  await bundles.writeEntryFiles();

  // in prod, only bundle what looks invalid or missing
  if (config.get('env.prod')) bundles = await kbnServer.bundles.getInvalidBundles();

  let bundleIds = bundles.getIds();

  // we might not have any work to do
  if (!bundleIds.length) {
    server.log(
      ['debug', 'optimize'],
      `All bundles are cached and ready to go!`
    );
    return;
  }

  // only require the FsOptimizer when we need to
  let FsOptimizer = require('./FsOptimizer');
  let optimizer = new FsOptimizer({
    env: bundles.env,
    bundles: bundles,
    sourceMaps: config.get('optimize.sourceMaps'),
    profile: config.get('optimize.profile')
  });

  try {
    server.log(
      ['info', 'optimize'],
      `Optimizing and caching bundles for ${bundleIds.join(', ')}. This may take a few minutes.`
    );

    let start = Date.now();
    await optimizer.run();
    let seconds = ((Date.now() - start) / 1000).toFixed(2);

    server.log(
      ['info', 'optimize'],
      `Optimization of ${bundleIds.join(', ')} complete in ${seconds} seconds.`
    );
  } catch (e) {
    if (e.stats) {
      server.log(['error'], e.stats.toString({ colors: true }));
    }
    server.log(['fatal'], e);
    process.exit(1); // eslint-disable-line  no-process-exit
  }
};
