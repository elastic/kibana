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

/**
 *  Combine the exportSpecs from a list of pluginSpecs
 *  by calling the reducers for each export type
 *  @param {Array<PluginSpecs>} pluginSpecs
 *  @param {Object<exportType,reducer>} reducers
 *  @param {Object<exportType,exports>} [defaults={}]
 *  @return {Object<exportType,exports>}
 */
export function reduceExportSpecs(pluginSpecs, reducers, defaults = {}) {
  return pluginSpecs.reduce((acc, pluginSpec) => {
    const specsByType = pluginSpec.getExportSpecs() || {};
    const types = Object.keys(specsByType);

    return types.reduce((acc, type) => {
      const reducer = reducers[type] || reducers.unknown;

      if (!reducer) {
        throw new Error(`Unknown export type ${type}`);
      }

      // convert specs to an array if not already one or
      // ignore the spec if it is undefined
      const specs = [].concat(specsByType[type] === undefined ? [] : specsByType[type]);

      return specs.reduce((acc, spec) => reducer(acc, spec, type, pluginSpec), acc);
    }, acc);
  }, defaults);
}
