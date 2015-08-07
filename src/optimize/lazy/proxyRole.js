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

};
