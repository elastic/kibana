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
import {
  argTypeRegistry,
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from '../../../x-pack/plugins/canvas/public/expression_types/index';
import { elementsRegistry } from '../../../x-pack/plugins/canvas/public/lib/elements_registry';
import { renderFunctionsRegistry } from '../../../x-pack/plugins/canvas/public/lib/render_functions_registry';
import { functionsRegistry as browserFunctions } from '../../../x-pack/plugins/canvas/public/lib/functions_registry';
import { loadPrivateBrowserFunctions } from '../../../x-pack/plugins/canvas/public/lib/load_private_browser_functions';

const registries = {
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

let resolve = null;
let called = false;

const populatePromise = new Promise(_resolve => {
  resolve = _resolve;
});

export const getBrowserRegistries = () => {
  return populatePromise;
};

export const populateBrowserRegistries = () => {
  if (called) throw new Error('function should only be called once per process');
  called = true;

  // loadPrivateBrowserFunctions is sync. No biggie.
  loadPrivateBrowserFunctions();

  const remainingTypes = Object.keys(registries);
  const populatedTypes = {};

  function loadType() {
    const type = remainingTypes.pop();
    window.canvas = window.canvas || {};
    window.canvas.register = d => registries[type].register(d);

    // Load plugins one at a time because each needs a different loader function
    // $script will only load each of these once, we so can call this as many times as we need?
    const pluginPath = chrome.addBasePath(`/api/canvas/plugins?type=${type}`);
    $script(pluginPath, () => {
      populatedTypes[type] = registries[type];

      if (remainingTypes.length) loadType();
      else resolve(populatedTypes);
    });
  }

  if (remainingTypes.length) loadType();
  return populatePromise;
};
