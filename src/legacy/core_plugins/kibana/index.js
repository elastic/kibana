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

import Fs from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import { importApi } from './server/routes/api/import';
import { exportApi } from './server/routes/api/export';
import { getUiSettingDefaults } from './server/ui_setting_defaults';
import { registerCspCollector } from './server/lib/csp_usage_collector';
import { injectVars } from './inject_vars';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { kbnBaseUrl } from '../../../plugins/kibana_legacy/server';

const mkdirAsync = promisify(Fs.mkdir);

export default function(kibana) {
  return new kibana.Plugin({
    id: 'kibana',
    config: function(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        index: Joi.string().default('.kibana'),
        autocompleteTerminateAfter: Joi.number()
          .integer()
          .min(1)
          .default(100000),
        // TODO Also allow units here like in elasticsearch config once this is moved to the new platform
        autocompleteTimeout: Joi.number()
          .integer()
          .min(1)
          .default(1000),
      }).default();
    },

    uiExports: {
      app: {
        id: 'kibana',
        title: 'Kibana',
        listed: false,
        main: 'plugins/kibana/kibana',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      links: [
        {
          id: 'kibana:stack_management',
          title: i18n.translate('kbn.managementTitle', {
            defaultMessage: 'Stack Management',
          }),
          order: 9003,
          url: `${kbnBaseUrl}#/management`,
          euiIconType: 'managementApp',
          linkToLastSubUrl: false,
          category: DEFAULT_APP_CATEGORIES.management,
        },
      ],

      injectDefaultVars(server, options) {
        const mapConfig = server.config().get('map');
        const tilemap = mapConfig.tilemap;

        return {
          kbnIndex: options.index,
          kbnBaseUrl,

          // required on all pages due to hacks that use these values
          mapConfig,
          tilemapsConfig: {
            deprecated: {
              // If url is set, old settings must be used for backward compatibility
              isOverridden: typeof tilemap.url === 'string' && tilemap.url !== '',
              config: tilemap,
            },
          },
        };
      },

      uiSettingDefaults: getUiSettingDefaults(),
    },

    preInit: async function(server) {
      try {
        // Create the data directory (recursively, if the a parent dir doesn't exist).
        // If it already exists, does nothing.
        await mkdirAsync(server.config().get('path.data'), { recursive: true });
      } catch (err) {
        server.log(['error', 'init'], err);
        // Stop the server startup with a fatal error
        throw err;
      }
    },

    init: async function(server) {
      const { usageCollection } = server.newPlatform.setup.plugins;
      // routes
      importApi(server);
      exportApi(server);
      registerCspCollector(usageCollection, server);
      server.injectUiAppVars('kibana', () => injectVars(server));
    },
  });
}
