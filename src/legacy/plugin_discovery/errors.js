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

const errorCodeProperty = Symbol('pluginDiscovery/errorCode');

/**
 *  Thrown when reading a plugin directory fails, wraps failure
 *  @type {String}
 */
const ERROR_INVALID_DIRECTORY = 'ERROR_INVALID_DIRECTORY';
export function createInvalidDirectoryError(sourceError, path) {
  sourceError[errorCodeProperty] = ERROR_INVALID_DIRECTORY;
  sourceError.path = path;
  return sourceError;
}
export function isInvalidDirectoryError(error) {
  return error && error[errorCodeProperty] === ERROR_INVALID_DIRECTORY;
}

/**
 *  Thrown when trying to create a PluginPack for a path that
 *  is not a valid plugin definition
 *  @type {String}
 */
const ERROR_INVALID_PACK = 'ERROR_INVALID_PACK';
export function createInvalidPackError(path, reason) {
  const error = new Error(`PluginPack${path ? ` at "${path}"` : ''} ${reason}`);
  error[errorCodeProperty] = ERROR_INVALID_PACK;
  error.path = path;
  return error;
}
export function isInvalidPackError(error) {
  return error && error[errorCodeProperty] === ERROR_INVALID_PACK;
}

/**
 *  Thrown when trying to load a PluginSpec that is invalid for some reason
 *  @type {String}
 */
const ERROR_INVALID_PLUGIN = 'ERROR_INVALID_PLUGIN';
export function createInvalidPluginError(spec, reason) {
  const error = new Error(
    `Plugin from ${spec.getId()} at ${spec.getPack().getPath()} is invalid because ${reason}`
  );
  error[errorCodeProperty] = ERROR_INVALID_PLUGIN;
  error.spec = spec;
  return error;
}
export function isInvalidPluginError(error) {
  return error && error[errorCodeProperty] === ERROR_INVALID_PLUGIN;
}

/**
 *  Thrown when trying to load a PluginSpec whose version is incompatible
 *  @type {String}
 */
const ERROR_INCOMPATIBLE_PLUGIN_VERSION = 'ERROR_INCOMPATIBLE_PLUGIN_VERSION';
export function createIncompatiblePluginVersionError(spec) {
  const error = new Error(
    `Plugin ${spec.getId()} is only compatible with Kibana version ${spec.getExpectedKibanaVersion()}`
  );
  error[errorCodeProperty] = ERROR_INCOMPATIBLE_PLUGIN_VERSION;
  error.spec = spec;
  return error;
}
export function isIncompatiblePluginVersionError(error) {
  return error && error[errorCodeProperty] === ERROR_INCOMPATIBLE_PLUGIN_VERSION;
}
