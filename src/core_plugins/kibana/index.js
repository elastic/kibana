import ingest from './server/routes/api/ingest';
import search from './server/routes/api/search';
import settings from './server/routes/api/settings';

module.exports = function (kibana) {
  return new kibana.Plugin({
    id: 'kibana',
    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultAppId: Joi.string().default('discover'),
        index: Joi.string().default('.kibana')
      }).default();
    },

    uiExports: {
      app: {
        id: 'kibana',
        title: 'Kibana',
        listed: false,
        description: 'the kibana you know and love',
        main: 'plugins/kibana/kibana',
        uses: [
          'visTypes',
          'spyModes',
          'fieldFormats',
          'navbarExtensions',
          'managementSections',
          'docViews'
        ],

        injectVars: function (server, options) {
          let config = server.config();

          return {
            kbnDefaultAppId: config.get('kibana.defaultAppId')
          };
        },
      },

      links: [
        {
          id: 'kibana:discover',
          title: 'Discover',
          order: -1003,
          url: '/app/kibana#/discover',
          description: 'interactively explore your data',
          icon: 'plugins/kibana/assets/discover.svg',
        },
        {
          id: 'kibana:visualize',
          title: 'Visualize',
          order: -1002,
          url: '/app/kibana#/visualize',
          description: 'design data visualizations',
          icon: 'plugins/kibana/assets/visualize.svg',
        },
        {
          id: 'kibana:dashboard',
          title: 'Dashboard',
          order: -1001,
          url: '/app/kibana#/dashboard',
          description: 'compose visualizations for much win',
          icon: 'plugins/kibana/assets/dashboard.svg',
        },
        {
          id: 'kibana:management',
          title: 'Management',
          order: 1000,
          url: '/app/kibana#/management',
          description: 'define index patterns, change config, and more',
          icon: 'plugins/kibana/assets/settings.svg',
          linkToLastSubUrl: false
        }
      ],
      injectDefaultVars(server, options) {
        return {
          kbnIndex: options.index
        };
      },
    },

    init: function (server, options) {
      ingest(server);
      search(server);
      settings(server);
    }
  });

};
