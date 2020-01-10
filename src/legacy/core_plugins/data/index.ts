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

import { resolve } from 'path';
import { Legacy } from '../../../../kibana';
import { mappings } from './mappings';
import { SavedQuery } from '../../../plugins/data/public';

// eslint-disable-next-line import/no-default-export
export default function DataPlugin(kibana: any) {
  const config: Legacy.PluginSpecOptions = {
    id: 'data',
    require: ['elasticsearch'],
    publicDir: resolve(__dirname, 'public'),
    config: (Joi: any) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    init: (server: Legacy.Server) => ({}),
    uiExports: {
      interpreter: ['plugins/data/search/expressions/boot'],
      injectDefaultVars: () => ({}),
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      mappings,
      savedObjectsManagement: {
        query: {
          icon: 'search',
          defaultSearchField: 'title',
          isImportableAndExportable: true,
          getTitle(obj: SavedQuery) {
            return obj.attributes.title;
          },
          getInAppUrl(obj: SavedQuery) {
            return {
              path: `/app/kibana#/discover?_a=(savedQuery:'${encodeURIComponent(obj.id)}')`,
              uiCapabilitiesPath: 'discover.show',
            };
          },
        },
      },
    },
  };

  return new kibana.Plugin(config);
}
