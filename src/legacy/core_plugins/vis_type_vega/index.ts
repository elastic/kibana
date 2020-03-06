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
import { Legacy } from 'kibana';

import { LegacyPluginApi, LegacyPluginInitializer } from '../../../../src/legacy/types';

const vegaPluginInitializer: LegacyPluginInitializer = ({ Plugin }: LegacyPluginApi) =>
  new Plugin({
    // TODO: ID property should be changed from 'vega' to 'vis_type_vega'
    // It is required to change the configuration property
    //   vega.enableExternalUrls -> vis_type_vega.enableExternalUrls
    id: 'vega',
    require: ['kibana', 'elasticsearch'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      hacks: [resolve(__dirname, 'public/legacy')],
      injectDefaultVars: server => {
        const serverConfig = server.config();
        const mapConfig: Record<string, any> = serverConfig.get('map');

        return {
          emsTileLayerId: mapConfig.emsTileLayerId,
        };
      },
    },
    init: (server: Legacy.Server) => ({}),
  } as Legacy.PluginSpecOptions);

// eslint-disable-next-line import/no-default-export
export default vegaPluginInitializer;
