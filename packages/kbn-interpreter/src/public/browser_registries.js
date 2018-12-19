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
import $script from 'scriptjs';

export const loadBrowserRegistries = (registries, basePath) => {
  const remainingTypes = Object.keys(registries);
  const populatedTypes = {};

  return new Promise(resolve => {
    function loadType() {
      if (!remainingTypes.length) {
        resolve(populatedTypes);
        return;
      }
      const type = remainingTypes.pop();
      window.canvas = window.canvas || {};
      window.canvas.register = d => registries[type].register(d);
      window.canvas.i18n = i18n;

      // Load plugins one at a time because each needs a different loader function
      // $script will only load each of these once, we so can call this as many times as we need?
      const pluginPath = `${basePath}/api/canvas/plugins?type=${type}`;
      $script(pluginPath, () => {
        populatedTypes[type] = registries[type];
        loadType();
      });
    }

    loadType();
  });
};
