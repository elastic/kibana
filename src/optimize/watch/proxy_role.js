import { fromNode } from 'bluebird';
import { get, once } from 'lodash';

export default (kbnServer, server, config) => {

  server.route({
    path: '/bundles/{path*}',
    method: 'GET',
    handler: {
      proxy: {
        host: config.get('optimize.watchHost'),
        port: config.get('optimize.watchPort'),
        passThrough: true,
        xforward: true
      }
    },
    config: { auth: false }
  });

  return fromNode(cb => {
    const timeout = setTimeout(() => {
      cb(new Error('Timeout waiting for the optimizer to become ready'));
    }, config.get('optimize.watchProxyTimeout'));

    const waiting = once(() => {
      server.log(['info', 'optimize'], 'Waiting for optimizer to be ready');
    });

    if (!process.connected) return;

    process.send(['WORKER_BROADCAST', { optimizeReady: '?' }]);
    process.on('message', (msg) => {
      switch (get(msg, 'optimizeReady')) {
        case true:
          clearTimeout(timeout);
          cb();
          break;
        case false:
          waiting();
          break;
      }
    });
  });

};
