import FsOptimizer from './fs_optimizer';
import { createBundlesRoute } from './bundles_route';

export default async (kbnServer, server, config) => {
  if (!config.get('optimize.enabled')) return;

  // the watch optimizer sets up two threads, one is the server listening
  // on 5601 and the other is a server listening on 5602 that builds the
  // bundles in a "middleware" style.
  //
  // the server listening on 5601 may be restarted a number of times, depending
  // on the watch setup managed by the cli. It proxies all bundles/* requests to
  // the other server. The server on 5602 is long running, in order to prevent
  // complete rebuilds of the optimize content.
  const watch = config.get('optimize.watch');
  if (watch) {
    return await kbnServer.mixin(require('./watch/watch'));
  }

  const { uiBundles } = kbnServer;
  server.route(createBundlesRoute({
    bundlesPath: uiBundles.getWorkingDir(),
    basePublicPath: config.get('server.basePath')
  }));

  await uiBundles.writeEntryFiles();

  // Not all entry files produce a css asset. Ensuring they exist prevents
  // an error from occuring when the file is missing.
  await uiBundles.ensureStyleFiles();

  // in prod, only bundle when someing is missing or invalid
  const reuseCache = config.get('optimize.useBundleCache')
    ? await uiBundles.areAllBundleCachesValid()
    : false;

  // we might not have any work to do
  if (reuseCache) {
    server.log(
      ['debug', 'optimize'],
      `All bundles are cached and ready to go!`
    );
    return;
  }

  // only require the FsOptimizer when we need to
  const optimizer = new FsOptimizer({
    uiBundles,
    profile: config.get('optimize.profile'),
    sourceMaps: config.get('optimize.sourceMaps'),
    unsafeCache: config.get('optimize.unsafeCache'),
  });

  server.log(
    ['info', 'optimize'],
    `Optimizing and caching ${uiBundles.getDescription()}. This may take a few minutes`
  );

  const start = Date.now();
  await optimizer.run();
  const seconds = ((Date.now() - start) / 1000).toFixed(2);

  server.log(['info', 'optimize'], `Optimization of ${uiBundles.getDescription()} complete in ${seconds} seconds`);
};
