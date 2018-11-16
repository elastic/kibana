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

import { typesRegistry } from '../common/lib/types_registry';
import { functionsRegistry as serverFunctions } from '../common/lib/functions_registry';
import { getPluginPaths } from './get_plugin_paths';

const registries = {
  serverFunctions: serverFunctions,
  commonFunctions: serverFunctions,
  types: typesRegistry,
};

let resolve = null;
let called = false;

const populatePromise = new Promise(_resolve => {
  resolve = _resolve;
});

export const getServerRegistries = () => {
  return populatePromise;
};

export const populateServerRegistries = types => {
  if (called) {
    console.log('function should only be called once per process');
    return populatePromise;
  }
  called = true;
  if (!types || !types.length) throw new Error('types is required');

  const remainingTypes = types;
  const populatedTypes = {};

  const globalKeys = Object.keys(global);

  const loadType = () => {
    const type = remainingTypes.pop();
    getPluginPaths(type).then(paths => {
      global.canvas = global.canvas || {};
      global.canvas.register = d => registries[type].register(d);

      paths.forEach(path => {
        require(path);
      });

      Object.keys(global).forEach(key => {
        if (!globalKeys.includes(key)) {
          delete global[key];
        }
      });

      populatedTypes[type] = registries[type];
      if (remainingTypes.length) loadType();
      else resolve(populatedTypes);
    });
  };

  if (remainingTypes.length) loadType();
  return populatePromise;
};
