import FsOptimizer from './fs_optimizer';
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
  const lazy = config.get('optimize.lazy');
  if (lazy) {
    return await kbnServer.mixin(require('./lazy/lazy'));
  }

  const bundles = kbnServer.bundles;
  server.exposeStaticDir('/bundles/{path*}', bundles.env.workingDir);
  await bundles.writeEntryFiles();

  // in prod, only bundle when someing is missing or invalid
  const invalidBundles = config.get('optimize.useBundleCache') ? await bundles.getInvalidBundles() : bundles;

  // we might not have any work to do
  if (!invalidBundles.getIds().length) {
    server.log(
      ['debug', 'optimize'],
      `All bundles are cached and ready to go!`
    );
    return;
  }

  // only require the FsOptimizer when we need to
  const optimizer = new FsOptimizer({
    env: bundles.env,
    bundles: bundles,
    profile: config.get('optimize.profile'),
    urlBasePath: config.get('server.basePath'),
    sourceMaps: config.get('optimize.sourceMaps'),
    unsafeCache: config.get('optimize.unsafeCache'),
  });

  server.log(
    ['info', 'optimize'],
    `Optimizing and caching ${bundles.desc()}. This may take a few minutes`
  );

  const start = Date.now();
  await optimizer.run();
  const seconds = ((Date.now() - start) / 1000).toFixed(2);

  server.log(['info', 'optimize'], `Optimization of ${bundles.desc()} complete in ${seconds} seconds`);
};
