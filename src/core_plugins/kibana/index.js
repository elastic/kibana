import { resolve } from 'path';

import Promise from 'bluebird';
import { mkdirp as mkdirpNode } from 'mkdirp';

import manageUuid from './server/lib/manage_uuid';
import search from './server/routes/api/search';
import settings from './server/routes/api/settings';
import { importApi } from './server/routes/api/import';
import { exportApi } from './server/routes/api/export';
import scripts from './server/routes/api/scripts';
import { registerSuggestionsApi } from './server/routes/api/suggestions';
import * as systemApi from './server/lib/system_api';
import mappings from './mappings.json';

const mkdirp = Promise.promisify(mkdirpNode);

module.exports = function (kibana) {
  const kbnBaseUrl = '/app/kibana';
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
      hacks: ['plugins/kibana/dev_tools/hacks/hide_empty_tools'],
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
          'devTools',
          'docViews'
        ],
        injectVars: function (server) {

          const serverConfig = server.config();

          //DEPRECATED SETTINGS
          //if the url is set, the old settings must be used.
          //keeping this logic for backward compatibilty.
          const configuredUrl = server.config().get('tilemap.url');
          const isOverridden = typeof configuredUrl === 'string' && configuredUrl !== '';
          const tilemapConfig = serverConfig.get('tilemap');
          const regionmapsConfig = serverConfig.get('regionmap');
          const mapConfig = serverConfig.get('map');


          regionmapsConfig.layers =  (regionmapsConfig.layers) ? regionmapsConfig.layers : [];

          return {
            kbnDefaultAppId: serverConfig.get('kibana.defaultAppId'),
            regionmapsConfig: regionmapsConfig,
            mapConfig: mapConfig,
            tilemapsConfig: {
              deprecated: {
                isOverridden: isOverridden,
                config: tilemapConfig,
              }
            }
          };
        },
      },

      links: [
        {
          id: 'kibana:discover',
          title: 'Discover',
          order: -1003,
          url: `${kbnBaseUrl}#/discover`,
          description: 'interactively explore your data',
          icon: 'plugins/kibana/assets/discover.svg',
        }, {
          id: 'kibana:visualize',
          title: 'Visualize',
          order: -1002,
          url: `${kbnBaseUrl}#/visualize`,
          description: 'design data visualizations',
          icon: 'plugins/kibana/assets/visualize.svg',
        }, {
          id: 'kibana:dashboard',
          title: 'Dashboard',
          order: -1001,
          url: `${kbnBaseUrl}#/dashboards`,
          // The subUrlBase is the common substring of all urls for this app. If not given, it defaults to the url
          // above. This app has to use a different subUrlBase, in addition to the url above, because "#/dashboard"
          // routes to a page that creates a new dashboard. When we introduced a landing page, we needed to change
          // the url above in order to preserve the original url for BWC. The subUrlBase helps the Chrome api nav
          // to determine what url to use for the app link.
          subUrlBase: `${kbnBaseUrl}#/dashboard`,
          description: 'compose visualizations for much win',
          icon: 'plugins/kibana/assets/dashboard.svg',
        }, {
          id: 'kibana:dev_tools',
          title: 'Dev Tools',
          order: 9001,
          url: '/app/kibana#/dev_tools',
          description: 'development tools',
          icon: 'plugins/kibana/assets/wrench.svg'
        }, {
          id: 'kibana:management',
          title: 'Management',
          order: 9003,
          url: `${kbnBaseUrl}#/management`,
          description: 'define index patterns, change config, and more',
          icon: 'plugins/kibana/assets/settings.svg',
          linkToLastSubUrl: false
        },
      ],

      injectDefaultVars(server, options) {
        return {
          kbnIndex: options.index,
          kbnBaseUrl
        };
      },

      translations: [
        resolve(__dirname, './translations/en.json')
      ],
      mappings
    },

    preInit: async function (server) {
      try {
        // Create the data directory (recursively, if the a parent dir doesn't exist).
        // If it already exists, does nothing.
        await mkdirp(server.config().get('path.data'));
      } catch (err) {
        server.log(['error', 'init'], err);
        // Stop the server startup with a fatal error
        throw err;
      }
    },

    init: function (server) {
      // uuid
      manageUuid(server);
      // routes
      search(server);
      settings(server);
      scripts(server);
      importApi(server);
      exportApi(server);
      registerSuggestionsApi(server);
      server.expose('systemApi', systemApi);
    }
  });
};
