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

import chrome from 'ui/chrome';
import $script from 'scriptjs';
import { typesRegistry } from '@kbn/interpreter/common/lib/types_registry';
import { functionsRegistry } from '@kbn/interpreter/common/lib/functions_registry';

let loading;
export const loadBrowserPlugins = (additionalTypes) => {

  const types = {
    commonFunctions: functionsRegistry,
    types: typesRegistry,
  };

  // if we are already loading, we need to wait till its done before starting again
  if (loading) {
    return loading.then(() => {
      loading = null;
      return loadBrowserPlugins(additionalTypes);
    });
  }

  loading = new Promise(resolve => {
    if (additionalTypes) {
      Object.keys(additionalTypes).forEach(key => {
        types[key] = additionalTypes[key];
      });
    }

    const remainingTypes = Object.keys(types);

    function loadType() {
      const type = remainingTypes.pop();
      window.canvas = window.canvas || {};
      window.canvas.register = d => types[type].register(d);
      // Load plugins one at a time because each needs a different loader function
      // $script will only load each of these once, we so can call this as many times as we need?
      const pluginPath = chrome.addBasePath(`/api/canvas/plugins?type=${type}`);
      $script(pluginPath, () => {
        if (remainingTypes.length) loadType();
        else resolve(true);
      });
    }

    loadType();
  });

  return loading;
};
