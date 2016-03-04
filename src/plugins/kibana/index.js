import ingest from './server/routes/api/ingest';

module.exports = function (kibana) {
  return new kibana.Plugin({

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultAppId: Joi.string().default('discover'),
        index: Joi.string().default('.kibana')
      }).default();
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
          'navbarExtensions',
          'settingsSections',
          'docViews'
        ],

        injectVars: function (server, options) {
          let config = server.config();

          return {
            kbnDefaultAppId: config.get('kibana.defaultAppId')
          };
        }
      }
    },

    init: function (server, options) {
      ingest(server);
    }
  });

};
