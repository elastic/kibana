module.exports = async (kbnServer, kibanaHapiServer, config) => {

  let src = require('requirefrom')('src');
  let fromRoot = src('utils/fromRoot');
  let LazyServer = require('./LazyServer');
  let LiveOptimizer = require('../LiveOptimizer');

  let server = new LazyServer(
    config.get('optimize.lazyHost'),
    config.get('optimize.lazyPort'),
    new LiveOptimizer({
      env: kbnServer.bundles.env,
      bundles: kbnServer.bundles,
      sourceMaps: config.get('optimize.sourceMaps')
    })
  );

  await server.init();
};
