/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @internal */
export enum PluginDiscoveryErrorType {
  IncompatibleVersion = 'incompatible-version',
  InvalidSearchPath = 'invalid-search-path',
  InvalidPluginPath = 'invalid-plugin-path',
  InvalidManifest = 'invalid-manifest',
  MissingManifest = 'missing-manifest',
}

/** @internal */
export class PluginDiscoveryError extends Error {
  public static incompatibleVersion(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.IncompatibleVersion, path, cause);
  }

  public static invalidSearchPath(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.InvalidSearchPath, path, cause);
  }

  public static invalidPluginPath(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.InvalidPluginPath, path, cause);
  }

  public static invalidManifest(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.InvalidManifest, path, cause);
  }

  public static missingManifest(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.MissingManifest, path, cause);
  }

  /**
   * @param type Type of the discovery error (invalid directory, invalid manifest etc.)
   * @param path Path at which discovery error occurred.
   * @param cause "Raw" error object that caused discovery error.
   */
  constructor(
    public readonly type: PluginDiscoveryErrorType,
    public readonly path: string,
    public readonly cause: Error
  ) {
    super(`${cause.message} (${type}, ${path})`);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, PluginDiscoveryError.prototype);
  }
}
