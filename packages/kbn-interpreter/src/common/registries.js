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
 * Add a new set of registries to an existing set of registries.
 *
 * @param {*} registries - The existing set of registries
 * @param {*} newRegistries - The new set of registries
 */
export function addRegistries(registries, newRegistries) {
  Object.keys(newRegistries).forEach(registryName => {
    if (registries[registryName]) {
      throw new Error(`There is already a registry named "${registryName}".`);
    }
    registries[registryName] = newRegistries[registryName];
  });

  return registries;
}

/**
 * Register a set of interpreter specs (functions, types, renderers, etc)
 *
 * @param {*} registries - The set of registries
 * @param {*} specs - The specs to be regsitered (e.g. { types: [], browserFunctions: [] })
 */
export function register(registries, specs) {
  Object.keys(specs).forEach(registryName => {
    if (!registries[registryName]) {
      throw new Error(`There is no registry named "${registryName}".`);
    }

    if (!registries[registryName].register) {
      throw new Error(`Registry "${registryName}" must have a register function.`);
    }
    specs[registryName].forEach(f => registries[registryName].register(f));
  });

  return registries;
}

/**
 * A convenience function for exposing registries and register in a plugin-friendly way
 * as a global in the browser, and as server.plugins.interpreter.register | registries
 * on the server.
 *
 * @param {*} registries - The registries to wrap.
 */
export function registryFactory(registries) {
  return {
    // This is a getter function. We can't make it a property or a proper
    // getter, because Kibana server will improperly clone it.
    registries() {
      return registries;
    },

    register(specs) {
      return register(registries, specs);
    },
  };
}
