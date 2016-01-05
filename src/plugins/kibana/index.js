const Boom = require('boom');

module.exports = function (kibana) {
  return new kibana.Plugin({

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultAppId: Joi.string().default('discover'),
        index: Joi.string().default('.kibana')
      }).default();
    },

    init: function(server) {
      server.route({
        path: '/api/kibana/simulate',
        method: 'POST',
        handler: function(request, reply) {
          var client = server.plugins.elasticsearch.client;

          client.transport.request({
            path: '_ingest/pipeline/_simulate',
            query: { verbose: true },
            method: 'POST',
            body: request.payload
          }, function(err, resp) {
            //use boom to make a pretty err response
            //if (err) reply(Boom.wrap(err));
            if (err) {
              reply();
            } else {
              reply(resp);
            }
          });
        }
      });
    },

    uiExports: {
      app: {
        title: 'Kibana',
        description: 'the kibana you know and love',
        //icon: 'plugins/kibana/settings/sections/about/barcode.svg',
        main: 'plugins/kibana/kibana',
        uses: [
          'visTypes',
          'spyModes'
        ],

        autoload: kibana.autoload.require.concat(
          'plugins/kibana/discover',
          'plugins/kibana/visualize',
          'plugins/kibana/dashboard',
          'plugins/kibana/settings',
          'plugins/kibana/settings/sections',
          'plugins/kibana/doc',
          'plugins/kibana/settings/sections',
          'ui/vislib',
          'ui/agg_response',
          'ui/agg_types',
          'leaflet'
        ),

        injectVars: function (server, options) {
          let config = server.config();

          return {
            kbnDefaultAppId: config.get('kibana.defaultAppId')
          };
        }
      }
    }
  });

};
