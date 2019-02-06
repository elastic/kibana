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

import { i18n } from '@kbn/i18n';
import { getPluginPaths } from './get_plugin_paths';


export const populateServerRegistries = registries => {
  if (!registries) throw new Error('registries are required');

  return new Promise(resolve => {
    const remainingTypes = Object.keys(registries);
    const populatedTypes = {};

    const loadType = () => {
      const type = remainingTypes.pop();
      getPluginPaths(type).then(paths => {
        global.canvas = global.canvas || {};
        global.canvas.register = d => registries[type].register(d);
        global.canvas.i18n = i18n;

        paths.forEach(path => {
          require(path); // eslint-disable-line import/no-dynamic-require
        });

        delete global.canvas;

        populatedTypes[type] = registries[type];
        if (remainingTypes.length) {
          loadType();
        }
        else {
          resolve(populatedTypes);
        }
      });
    };

    if (remainingTypes.length) loadType();
  });
};
