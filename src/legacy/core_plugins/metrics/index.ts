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
import { PluginInitializerContext } from 'src/core/server';
import { CoreSetup } from 'src/core/server';
import { plugin } from './server/';
import { CustomCoreSetup } from './server/plugin';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    id: 'metrics',

    require: ['kibana', 'elasticsearch', 'visualizations', 'data'],

    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      hacks: ['plugins/metrics/'],
    },

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        chartResolution: Joi.number().default(150),
        minimumBucketSize: Joi.number().default(10),
      }).default();
    },

    init(server: Legacy.Server) {
      const initializerContext = {} as PluginInitializerContext;
      const core = { http: { server } } as CoreSetup & CustomCoreSetup;

      plugin(initializerContext).setup(core);
    },
  });
}
