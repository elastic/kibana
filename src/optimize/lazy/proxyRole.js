let { fromNode } = require('bluebird');
let { get } = require('lodash');

module.exports = (kbnServer, server, config) => {

  server.route({
    path: '/bundles/{path*}',
    method: 'GET',
    handler: {
      proxy: {
        host: config.get('optimize.lazyHost'),
        port: config.get('optimize.lazyPort'),
        passThrough: true,
        xforward: true
      }
    }
  });

  return fromNode(cb => {
    let timeout = setTimeout(() => {
      cb(new Error('Server timedout waiting for the optimizer to become ready'));
    }, config.get('optimize.lazyProxyTimeout'));

    process.send(['WORKER_BROADCAST', { optimizeReady: '?' }]);
    process.on('message', (msg) => {
      if (get(msg, 'optimizeReady')) {
        clearTimeout(timeout);
        cb();
      }
    });
  });

};
