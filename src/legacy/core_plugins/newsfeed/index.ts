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
import { NewsfeedPluginInjectedConfig } from '../../../plugins/newsfeed/types';
import {
  PLUGIN_ID,
  DEFAULT_SERVICE_URLROOT,
  DEV_SERVICE_URLROOT,
  DEFAULT_SERVICE_PATH,
} from './constants';

// eslint-disable-next-line import/no-default-export
export default function(kibana: LegacyPluginApi): ArrayOrItem<LegacyPluginSpec> {
  const pluginSpec: Legacy.PluginSpecOptions = {
    id: PLUGIN_ID,
    config(Joi: any) {
      // NewsfeedPluginInjectedConfig in Joi form
      return Joi.object({
        enabled: Joi.boolean().default(true),
        service: Joi.object({
          pathTemplate: Joi.string().default(DEFAULT_SERVICE_PATH),
          urlRoot: Joi.when('$prod', {
            is: true,
            then: Joi.string().default(DEFAULT_SERVICE_URLROOT),
            otherwise: Joi.string().default(DEV_SERVICE_URLROOT),
          }),
        }).default(),
        defaultLanguage: Joi.string().default('en'),
        mainInterval: Joi.number().default(120 * 1000), // (2min) How often to retry failed fetches, and/or check if newsfeed items need to be refreshed from remote
        fetchInterval: Joi.number().default(86400 * 1000), // (1day) How often to fetch remote and reset the last fetched time
      }).default();
    },
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      injectDefaultVars(server): NewsfeedPluginInjectedConfig {
        const config = server.config();
        return {
          newsfeed: {
            service: {
              pathTemplate: config.get('newsfeed.service.pathTemplate') as string,
              urlRoot: config.get('newsfeed.service.urlRoot') as string,
            },
            defaultLanguage: config.get('newsfeed.defaultLanguage') as string,
            mainInterval: config.get('newsfeed.mainInterval') as number,
            fetchInterval: config.get('newsfeed.fetchInterval') as number,
          },
        };
      },
    },
  };
  return new kibana.Plugin(pluginSpec);
}
