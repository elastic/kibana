const _ = require('lodash');
const Boom = require('boom');

module.exports = function (kibana) {
  const healthCheck = require('./lib/health_check');
  const exposeClient = require('./lib/expose_client');
  const createProxy = require('./lib/create_proxy');

  return new kibana.Plugin({
    require: ['kibana'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
        preserveHost: Joi.boolean().default(true),
        username: Joi.string(),
        password: Joi.string(),
        shardTimeout: Joi.number().default(0),
        requestTimeout: Joi.number().default(30000),
        pingTimeout: Joi.number().default(30000),
        startupTimeout: Joi.number().default(5000),
        ssl: Joi.object({
          verify: Joi.boolean().default(true),
          ca: Joi.array().single().items(Joi.string()),
          cert: Joi.string(),
          key: Joi.string()
        }).default(),
        apiVersion: Joi.string().default('2.0'),
        engineVersion: Joi.string().valid('^2.2.0').default('^2.2.0')
      }).default();
    },

    init(server, options) {
      const config = server.config();

      // Expose the client to the server
      exposeClient(server);
      createProxy(server, 'GET', '/{paths*}');
      createProxy(server, 'POST', '/_mget');
      createProxy(server, 'POST', '/{index}/_search');
      createProxy(server, 'POST', '/{index}/_field_stats');
      createProxy(server, 'POST', '/_msearch');
      createProxy(server, 'POST', '/_search/scroll');

      function noBulkCheck(request, reply) {
        if (/\/_bulk/.test(request.path)) {
          return reply({
            error: 'You can not send _bulk requests to this interface.'
          }).code(400).takeover();
        }
        return reply.continue();
      }

      function noCreateIndex(request, reply) {
        const requestPath = _.trimRight(_.trim(request.path), '/');
        const matchPath = createProxy.createPath(config.get('kibana.index'));

        if (requestPath === matchPath) {
          return reply(Boom.methodNotAllowed('You cannot modify the primary kibana index through this interface.'));
        }

        reply.continue();
      }

      // These routes are actually used to deal with things such as managing
      // index patterns and advanced settings, but since hapi treats route
      // wildcards as zero-or-more, the routes also match the kibana index
      // itself. The client-side kibana code does not deal with creating nor
      // destroying the kibana index, so we limit that ability here.
      createProxy(
        server,
        ['PUT', 'POST', 'DELETE'],
        '/' + config.get('kibana.index') + '/{paths*}',
        {
          pre: [ noCreateIndex, noBulkCheck ]
        }
      );

      // Set up the health check service and start it.
      const hc = healthCheck(this, server);
      server.expose('waitUntilReady', hc.waitUntilReady);
      hc.start();
    }
  });

};
