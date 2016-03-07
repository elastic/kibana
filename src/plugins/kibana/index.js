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

    ui: {
      app: {
        title: 'Kibana',
        description: 'the kibana you know and love',
        main: './kibana.js',
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
