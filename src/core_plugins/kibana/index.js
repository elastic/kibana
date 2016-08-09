import Promise from 'bluebird';
import { mkdirp as mkdirpNode } from 'mkdirp';
import manageUuid from './server/lib/manage_uuid';
import fs from 'fs';
import i18nPlugin from '../i18n/server/i18n/index';
import ingest from './server/routes/api/ingest';
import kibanaPackage from '../../utils/package_json';
import Promise from 'bluebird';
import search from './server/routes/api/search';
import settings from './server/routes/api/settings';
import scripts from './server/routes/api/scripts';
import * as systemApi from './server/lib/system_api';

const mkdirp = Promise.promisify(mkdirpNode);
const readdir = Promise.promisify(fs.readdir);

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

        injectVars: function (server, options) {
          const config = server.config();
          return {
            kbnDefaultAppId: config.get('kibana.defaultAppId'),
            tilemap: config.get('tilemap')
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
          url: `${kbnBaseUrl}#/dashboard`,
          description: 'compose visualizations for much win',
          icon: 'plugins/kibana/assets/dashboard.svg',
        }, {
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

    init: function (server, options) {
      // uuid
      manageUuid(server);
      // routes
      ingest(server);
      search(server);
      settings(server);
      scripts(server);
      server.expose('systemApi', systemApi);
      registerCoreTranslations();
    }
  });

};

function registerCoreTranslations()
{
  const rootDir = kibanaPackage.__dirname;

  //Add translation dirs for the core plugins here
  const corePluginTranslationDirs = [rootDir + '/src/ui/i18n'];

  return Promise.map(corePluginTranslationDirs, (dir) => {
    readdir(dir).then((dirListing) => {
      Promise.map(dirListing, (listing) => {
        const fullFilePath = dir + '/' + listing;
        i18nPlugin.registerTranslations(fullFilePath);
      });
    });
  });
}
