import WatchServer from './watch_server';
import WatchOptimizer from './watch_optimizer';

export default async (kbnServer, kibanaHapiServer, config) => {
  const server = new WatchServer(
    config.get('optimize.watchHost'),
    config.get('optimize.watchPort'),
    config.get('server.basePath'),
    new WatchOptimizer({
      log: (tags, data) => kibanaHapiServer.log(tags, data),
      uiBundles: kbnServer.uiBundles,
      profile: config.get('optimize.profile'),
      sourceMaps: config.get('optimize.sourceMaps'),
      prebuild: config.get('optimize.watchPrebuild'),
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
