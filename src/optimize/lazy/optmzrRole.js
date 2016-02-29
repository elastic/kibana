import LazyServer from './LazyServer';
import LazyOptimizer from './LazyOptimizer';
import fromRoot from '../../utils/fromRoot';

export default async (kbnServer, kibanaHapiServer, config) => {
  let server = new LazyServer(
    config.get('optimize.lazyHost'),
    config.get('optimize.lazyPort'),
    new LazyOptimizer({
      log: (tags, data) => kibanaHapiServer.log(tags, data),
      env: kbnServer.bundles.env,
      bundles: kbnServer.bundles,
      profile: config.get('optimize.profile'),
      sourceMaps: config.get('optimize.sourceMaps'),
      prebuild: config.get('optimize.lazyPrebuild'),
      urlBasePath: config.get('server.basePath'),
      unsafeCache: config.get('optimize.unsafeCache'),
    })
  );

  let ready = false;

  let sendReady = () => {
    if (!process.connected) return;
    process.send(['WORKER_BROADCAST', { optimizeReady: ready }]);
  };

  process.on('message', (msg) => {
    if (msg && msg.optimizeReady === '?') sendReady();
  });


  sendReady();

  await server.init();

  ready = true;
  sendReady();
};
