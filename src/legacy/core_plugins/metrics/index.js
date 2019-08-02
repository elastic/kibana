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

import { fieldsRoutes } from './server/routes/fields';
import { visDataRoutes } from './server/routes/vis';
import { SearchStrategiesRegister } from './server/lib/search_strategies/search_strategies_register';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],

    uiExports: {
      visTypes: ['plugins/metrics/kbn_vis_types'],
      interpreter: ['plugins/metrics/tsvb_fn'],
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        chartResolution: Joi.number().default(150),
        minimumBucketSize: Joi.number().default(10),
      }).default();
    },

    init(server) {
      fieldsRoutes(server);
      visDataRoutes(server);

      SearchStrategiesRegister.init(server);
    },
  });
}
