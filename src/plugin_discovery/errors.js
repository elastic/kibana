
const $code = Symbol('FindErrorCode');

/**
 *  Thrown when reading a plugin directory fails, wraps failure
 *  @type {String}
 */
const ERROR_INVALID_DIRECTORY = 'ERROR_INVALID_DIRECTORY';
export function createInvalidDirectoryError(sourceError, path) {
  sourceError[$code] = ERROR_INVALID_DIRECTORY;
  sourceError.path = path;
  return sourceError;
}
export function isInvalidDirectoryError(error) {
  return error && error[$code] === ERROR_INVALID_DIRECTORY;
}


/**
 *  Thrown when trying to create a PluginPack for a path that
 *  is not a valid plugin definition
 *  @type {String}
 */
const ERROR_INVALID_PACK = 'ERROR_INVALID_PACK';
export function createInvalidPackError(path, reason) {
  const error = new Error(`PluginPack${path ? ` at "${path}"` : ''} ${reason}`);
  error[$code] = ERROR_INVALID_PACK;
  error.path = path;
  return error;
}
export function isInvalidPackError(error) {
  return error && error[$code] === ERROR_INVALID_PACK;
}
