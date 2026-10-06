const Hapi = require('@hapi/hapi');

async function start() {
  const server = Hapi.server({
    port: 3000,
    host: '0.0.0.0',
  });

  await server.register(require('@hapi/h2o2'));

  server.route({
    method: 'POST',
    path: '/.epipe/_doc/0',
    options: {
      payload: {
        parse: false,
        output: 'stream',
      },
    },
    handler: async (req, h) => {
      console.log('Received request for /.epipe/_doc/0');

      req.payload.on('data', (chunk) => {
        if (chunk.toString().includes('1')) {
          setTimeout(() => {
            console.log('Destroying socket');
            req.raw.res.socket.destroy();
          }, 1000);
        }
      });

      return h
        .response(req.payload)
        .type('application/json')
        .header('x-elastic-product', 'Elasticsearch');
    },
  });

  server.route({
    method: '*',
    path: '/{path*}',
    options: {
      payload: {
        maxBytes: 1024 * 1024 * 10,
      },
    },
    handler: {
      proxy: {
        passThrough: true,
        mapUri(request) {
          const path = request.params.path || '';
          const query = new URLSearchParams(request.query).toString();

          return {
            uri: `http://127.0.0.1:9200/${path}${query ? `?${query}` : ''}`,
          };
        },
        onResponse: async function (err, res, request, h, settings, ttl) {
          if (err) {
            throw err;
          }

          const response = h.response(res);
          response.code(res.statusCode);

          for (const [name, value] of Object.entries(res.headers)) {
            response.header(name, value);
          }

          return response.ttl(ttl);
        },
      },
    },
  });

  await server.start();
  console.log(`Proxy listening on ${server.info.uri}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
