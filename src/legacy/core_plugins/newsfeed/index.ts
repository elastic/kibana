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
import { LegacyPluginApi, LegacyPluginSpec, ArrayOrItem } from 'src/legacy/plugin_discovery/types';
import { Legacy } from 'kibana';
import { PLUGIN_ID, DEFAULT_SERVICE_URLROOT } from './constants';

// eslint-disable-next-line import/no-default-export
export default function(kibana: LegacyPluginApi): ArrayOrItem<LegacyPluginSpec> {
  const pluginSpec: Legacy.PluginSpecOptions = {
    id: PLUGIN_ID,
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        urlRoot: Joi.when('$dev', {
          is: true,
          then: Joi.string().default(DEFAULT_SERVICE_URLROOT),
          otherwise: Joi.string()
            .default(DEFAULT_SERVICE_URLROOT)
            .valid(DEFAULT_SERVICE_URLROOT),
        }), // urlRoot can only be changed from default when running in dev
      }).default();
    },
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      injectDefaultVars(server) {
        const config = server.config();
        return {
          newsfeedServiceUrlRoot: config.get('newsfeed.urlRoot'),
        };
      },
    },
  };
  return new kibana.Plugin(pluginSpec);
}
