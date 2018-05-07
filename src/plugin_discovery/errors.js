
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
 *  Thrown when trying to load a PluginSpec that is invalid for some reason
 *  @type {String}
 */
const ERROR_INVALID_PLUGIN = 'ERROR_INVALID_PLUGIN';
export function createInvalidPluginError(id, directory, reason) {
  const error = new Error(`Plugin${id ? ` ${id}` : ''} at ${directory} is invalid because ${reason}`);
  error[errorCodeProperty] = ERROR_INVALID_PLUGIN;
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
  const error = new Error(`Plugin ${spec.getId()} is only compatible with Kibana version ${spec.getExpectedKibanaVersion()}`);
  error[errorCodeProperty] = ERROR_INCOMPATIBLE_PLUGIN_VERSION;
  error.spec = spec;
  return error;
}
export function isIncompatiblePluginVersionError(error) {
  return error && error[errorCodeProperty] === ERROR_INCOMPATIBLE_PLUGIN_VERSION;
}
