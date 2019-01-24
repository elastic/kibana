/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Promise from 'bluebird';
import { mkdirp as mkdirpNode } from 'mkdirp';
import { resolve } from 'path';

import manageUuid from './server/lib/manage_uuid';
import { searchApi } from './server/routes/api/search';
import { scrollSearchApi } from './server/routes/api/scroll_search';
import { importApi } from './server/routes/api/import';
import { exportApi } from './server/routes/api/export';
import { homeApi } from './server/routes/api/home';
import { managementApi } from './server/routes/api/management';
import { scriptsApi } from './server/routes/api/scripts';
import { registerSuggestionsApi } from './server/routes/api/suggestions';
import { registerKqlTelemetryApi } from './server/routes/api/kql_telemetry';
import { registerFieldFormats } from './server/field_formats/register';
import { registerTutorials } from './server/tutorials/register';
import * as systemApi from './server/lib/system_api';
import handleEsError from './server/lib/handle_es_error';
import mappings from './mappings.json';
import { getUiSettingDefaults } from './ui_setting_defaults';
import { makeKQLUsageCollector } from './server/lib/kql_usage_collector';
import { injectVars } from './inject_vars';
import { i18n } from '@kbn/i18n';

const mkdirp = Promise.promisify(mkdirpNode);

export default function (kibana) {
  const kbnBaseUrl = '/app/kibana';
  return new kibana.Plugin({
    id: 'kibana',
    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultAppId: Joi.string().default('home'),
        index: Joi.string().default('.kibana'),
        disableWelcomeScreen: Joi.boolean().default(false),
      }).default();
    },

    uiExports: {
      hacks: ['plugins/kibana/dev_tools/hacks/hide_empty_tools'],
      fieldFormats: ['plugins/kibana/field_formats/register'],
      savedObjectTypes: [
        'plugins/kibana/visualize/saved_visualizations/saved_visualization_register',
        'plugins/kibana/discover/saved_searches/saved_search_register',
        'plugins/kibana/dashboard/saved_dashboard/saved_dashboard_register',
      ],
      app: {
        id: 'kibana',
        title: 'Kibana',
        listed: false,
        description: i18n.translate('kbn.kibanaDescription', {
          defaultMessage: 'the kibana you know and love'
        }),
        main: 'plugins/kibana/kibana',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      links: [
        {
          id: 'kibana:discover',
          title: i18n.translate('kbn.discoverTitle', {
            defaultMessage: 'Discover'
          }),
          order: -1003,
          url: `${kbnBaseUrl}#/discover`,
          description: i18n.translate('kbn.discoverDescription', {
            defaultMessage: 'interactively explore your data'
          }),
          icon: 'plugins/kibana/assets/discover.svg',
          euiIconType: 'discoverApp',
        }, {
          id: 'kibana:visualize',
          title: i18n.translate('kbn.visualizeTitle', {
            defaultMessage: 'Visualize'
          }),
          order: -1002,
          url: `${kbnBaseUrl}#/visualize`,
          description: i18n.translate('kbn.visualizeDescription', {
            defaultMessage: 'design data visualizations'
          }),
          icon: 'plugins/kibana/assets/visualize.svg',
          euiIconType: 'visualizeApp',
        }, {
          id: 'kibana:dashboard',
          title: i18n.translate('kbn.dashboardTitle', {
            defaultMessage: 'Dashboard'
          }),
          order: -1001,
          url: `${kbnBaseUrl}#/dashboards`,
          // The subUrlBase is the common substring of all urls for this app. If not given, it defaults to the url
          // above. This app has to use a different subUrlBase, in addition to the url above, because "#/dashboard"
          // routes to a page that creates a new dashboard. When we introduced a landing page, we needed to change
          // the url above in order to preserve the original url for BWC. The subUrlBase helps the Chrome api nav
          // to determine what url to use for the app link.
          subUrlBase: `${kbnBaseUrl}#/dashboard`,
          description: i18n.translate('kbn.dashboardDescription', {
            defaultMessage: 'compose visualizations for much win'
          }),
          icon: 'plugins/kibana/assets/dashboard.svg',
          euiIconType: 'dashboardApp',
        }, {
          id: 'kibana:dev_tools',
          title: i18n.translate('kbn.devToolsTitle', {
            defaultMessage: 'Dev Tools'
          }),
          order: 9001,
          url: '/app/kibana#/dev_tools',
          description: i18n.translate('kbn.devToolsDescription', {
            defaultMessage: 'development tools'
          }),
          icon: 'plugins/kibana/assets/wrench.svg',
          euiIconType: 'devToolsApp',
        }, {
          id: 'kibana:management',
          title: i18n.translate('kbn.managementTitle', {
            defaultMessage: 'Management'
          }),
          order: 9003,
          url: `${kbnBaseUrl}#/management`,
          description: i18n.translate('kbn.managementDescription', {
            defaultMessage: 'define index patterns, change config, and more'
          }),
          icon: 'plugins/kibana/assets/settings.svg',
          euiIconType: 'managementApp',
          linkToLastSubUrl: false
        },
      ],

      savedObjectSchemas: {
        'kql-telemetry': {
          isNamespaceAgnostic: true,
        },
      },

      injectDefaultVars(server, options) {
        return {
          kbnIndex: options.index,
          kbnBaseUrl
        };
      },

      mappings,
      uiSettingDefaults: getUiSettingDefaults(),
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
      searchApi(server);
      scriptsApi(server);
      scrollSearchApi(server);
      importApi(server);
      exportApi(server);
      homeApi(server);
      managementApi(server);
      registerSuggestionsApi(server);
      registerKqlTelemetryApi(server);
      registerFieldFormats(server);
      registerTutorials(server);
      makeKQLUsageCollector(server);
      server.expose('systemApi', systemApi);
      server.expose('handleEsError', handleEsError);
      server.injectUiAppVars('kibana', () => injectVars(server));
    }
  });
}
