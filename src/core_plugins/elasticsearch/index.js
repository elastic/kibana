import { trim, trimRight } from 'lodash';
import { methodNotAllowed } from 'boom';

import healthCheck from './lib/health_check';
import exposeClient from './lib/expose_client';
import createProxy, { createPath } from './lib/create_proxy';

const DEFAULT_REQUEST_HEADERS = [ 'authorization' ];

module.exports = function ({ Plugin }) {
  return new Plugin({
    require: ['kibana'],

    config(Joi) {
      const { array, boolean, number, object, string, ref } = Joi;

      return object({
        enabled: boolean().default(true),
        url: string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
        preserveHost: boolean().default(true),
        username: string(),
        password: string(),
        shardTimeout: number().default(0),
        requestTimeout: number().default(30000),
        requestHeadersWhitelist: array().items().single().default(DEFAULT_REQUEST_HEADERS),
        pingTimeout: number().default(ref('requestTimeout')),
        startupTimeout: number().default(5000),
        ssl: object({
          verify: boolean().default(true),
          ca: array().single().items(string()),
          cert: string(),
          key: string()
        }).default(),
        apiVersion: Joi.string().default('master'),
        engineVersion: Joi.string().valid('^5.0.0').default('^5.0.0')
      }).default();
    },

    uiExports: {
      injectDefaultVars(server, options) {
        return {
          esRequestTimeout: options.requestTimeout,
          esShardTimeout: options.shardTimeout,
          esApiVersion: options.apiVersion,
        };
      }
    },

    init(server, options) {
      const kibanaIndex = server.config().get('kibana.index');

      // Expose the client to the server
      exposeClient(server);
      createProxy(server, 'GET', '/{paths*}');
      createProxy(server, 'POST', '/_mget');
      createProxy(server, 'POST', '/{index}/_search');
      createProxy(server, 'POST', '/{index}/_field_stats');
      createProxy(server, 'POST', '/_msearch');
      createProxy(server, 'POST', '/_search/scroll');

      function noBulkCheck({ path }, reply) {
        if (/\/_bulk/.test(path)) {
          return reply({
            error: 'You can not send _bulk requests to this interface.'
          }).code(400).takeover();
        }
        return reply.continue();
      }

      function noDirectIndex({ path }, reply) {
        const requestPath = trimRight(trim(path), '/');
        const matchPath = createPath(kibanaIndex);

        if (requestPath === matchPath) {
          return reply(methodNotAllowed('You cannot modify the primary kibana index through this interface.'));
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
        `/${kibanaIndex}/{paths*}`,
        {
          pre: [ noDirectIndex, noBulkCheck ]
        }
      );

      // Set up the health check service and start it.
      const { start, waitUntilReady } = healthCheck(this, server);
      server.expose('waitUntilReady', waitUntilReady);
      start();
    }
  });

};
