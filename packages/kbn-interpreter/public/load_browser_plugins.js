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
import { typesRegistry } from '../common/lib/types_registry';
import {
  argTypeRegistry,
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from '../expression_types';
import { elementsRegistry } from './elements_registry';
import { renderFunctionsRegistry } from './render_functions_registry';
import { functionsRegistry as browserFunctions } from '../common/lib/functions_registry';
import { loadPrivateBrowserFunctions } from './load_private_browser_functions';

const types = {
  browserFunctions: browserFunctions,
  commonFunctions: browserFunctions,
  elements: elementsRegistry,
  types: typesRegistry,
  renderers: renderFunctionsRegistry,
  transformUIs: transformRegistry,
  datasourceUIs: datasourceRegistry,
  modelUIs: modelRegistry,
  viewUIs: viewRegistry,
  argumentUIs: argTypeRegistry,
};

export const loadBrowserPlugins = () =>
  new Promise(resolve => {
    loadPrivateBrowserFunctions();
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
