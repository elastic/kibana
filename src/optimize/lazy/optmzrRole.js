module.exports = async (kbnServer, kibanaHapiServer, config) => {

  let src = require('requirefrom')('src');
  let fromRoot = src('utils/fromRoot');
  let LazyServer = require('./LazyServer');
  let LiveOptimizer = require('./LazyOptimizer');

  let server = new LazyServer(
    config.get('optimize.lazyHost'),
    config.get('optimize.lazyPort'),
    new LiveOptimizer({
      log: (tags, data) => kibanaHapiServer.log(tags, data),
      env: kbnServer.bundles.env,
      bundles: kbnServer.bundles,
      sourceMaps: config.get('optimize.sourceMaps'),
      prebuild: config.get('optimize.lazyPrebuild')
    })
  );

  await server.init();

  let sendReady = () => {
    process.send(['WORKER_BROADCAST', { optimizeReady: true }]);
  };

  sendReady();
  process.on('message', (msg) => {
    if (msg && msg.optimizeReady === '?') sendReady();
  });
};
