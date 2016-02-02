const Boom = require('boom');
const { join } = require('path');
const requireAllAndApply = require('./lib/require_all_and_apply');
const ingest = require('./server/routes/api/ingest');

module.exports = function (kibana) {
  return new kibana.Plugin({

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultAppId: Joi.string().default('discover'),
        index: Joi.string().default('.kibana')
      }).default();
    },

    init: function (server) {
      //requireAllAndApply(join(__dirname, 'routes', '**', '*.js'), server);
      ingest(server);
    },

    uiExports: {
      app: {
        title: 'Kibana',
        description: 'the kibana you know and love',
        //icon: 'plugins/kibana/settings/sections/about/barcode.svg',
        main: 'plugins/kibana/kibana',
        uses: [
          'visTypes',
          'spyModes',
          'fieldFormats',
          'navbarExtensions'
        ],

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
