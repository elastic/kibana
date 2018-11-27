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

import $script from 'scriptjs';

let resolvePromise = null;
let called = false;

let populatePromise = new Promise(_resolve => {
  resolvePromise = _resolve;
});

export const getBrowserRegistries = () => {
  return populatePromise;
};

const loadBrowserRegistries = (registries, basePath) => {
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

export const populateBrowserRegistries = (registries, basePath) => {
  if (called) {
    const oldPromise = populatePromise;
    let newResolve;
    populatePromise = new Promise(_resolve => {
      newResolve = _resolve;
    });
    oldPromise.then(oldTypes => {
      loadBrowserRegistries(registries, basePath).then(newTypes => {
        newResolve({
          ...oldTypes,
          ...newTypes,
        });
      });
    });
    return populatePromise;
  }
  called = true;
  loadBrowserRegistries(registries, basePath).then(registries => {
    resolvePromise(registries);
  });
  return populatePromise;
};
