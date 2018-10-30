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

const registry = {};

/**
 * Attempts to register the provided component.
 * If a component with that ID is already registered, then the registration fails.
 *
 * @param {*} id the id of the component to register
 * @param {*} component the component
 */
export function tryRegisterSettingsComponent(id, component) {
  if (id in registry) {
    return false;
  }

  registerSettingsComponent(id, component);
  return true;
}

/**
 * Attempts to register the provided component, with the ability to optionally allow
 * the component to override an existing one.
 *
 * If the intent is to override, then `allowOverride` must be set to true, otherwise an exception is thrown.
 *
 * @param {*} id the id of the component to register
 * @param {*} component the component
 * @param {*} allowOverride (default: false) - optional flag to allow this component to override a previously registered component
 */
export function registerSettingsComponent(id, component, allowOverride = false) {
  if (!allowOverride && id in registry) {
    throw new Error(`Component with id ${id} is already registered.`);
  }

  // Setting a display name if one does not already exist.
  // This enhances the snapshots, as well as the debugging experience.
  if (!component.displayName) {
    component.displayName = id;
  }

  registry[id] = component;
}

/**
 * Retrieve a registered component by its ID.
 * If the component does not exist, then an exception is thrown.
 *
 * @param {*} id the ID of the component to retrieve
 */
export function getSettingsComponent(id) {
  if (!(id in registry)) {
    throw new Error(`Component not found with id ${id}`);
  }
  return registry[id];
}