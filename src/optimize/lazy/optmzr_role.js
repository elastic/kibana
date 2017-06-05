import LazyServer from './lazy_server';
import LazyOptimizer from './lazy_optimizer';

export default async (kbnServer, kibanaHapiServer, config) => {
  const server = new LazyServer(
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

  const sendReady = () => {
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
