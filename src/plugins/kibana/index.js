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
          'navbarExtensions',
          'settingsSections',
        ],

        autoload: kibana.autoload.require.concat(
          'plugins/kibana/discover',
          'plugins/kibana/visualize',
          'plugins/kibana/dashboard',
          'plugins/kibana/settings',
          'plugins/kibana/doc',
          'ui/vislib',
          'ui/agg_response',
          'ui/agg_types',
          'leaflet'
        ),

        injectVars: function (server, options) {
          let config = server.config();

          return {
            kbnDefaultAppId: config.get('kibana.defaultAppId'),
            tilemap: config.get('tilemap')
          };
        }
      },

      injectDefaultVars(server, options) {
        return {
          kbnIndex: options.index
        };
      },
    }
  });

};
