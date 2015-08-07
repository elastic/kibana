/**
 * Optimize source code in a way that is suitable for distribution
 */
module.exports = async (kbnServer, server, config) => {
  let FsOptimizer = require('../FsOptimizer');

  let optimizer = new FsOptimizer({
    env: kbnServer.bundles.env,
    bundles: kbnServer.bundles,
    sourceMaps: config.get('optimize.sourceMaps')
  });

  server.exposeStaticDir('/bundles/{path*}', kbnServer.bundles.env.workingDir);

  try {
    await optimizer.init();
    let bundleIds = optimizer.bundles.getIds();

    if (bundleIds.length) {
      server.log(
        ['warning', 'optimize'],
        `Optimizing bundles for ${bundleIds.join(', ')}. This may take a few minutes.`
      );
    } else {
      server.log(
        ['debug', 'optimize'],
        `All bundles are cached and ready to go!`
      );
    }

    await optimizer.run();
  } catch (e) {
    if (e.stats) {
      server.log(['error'], e.stats.toString({ colors: true }));
    }
    server.log(['fatal'], e);
    process.exit(1); // eslint-disable-line  no-process-exit
  }
};
