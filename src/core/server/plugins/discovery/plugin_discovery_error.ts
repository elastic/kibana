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

export enum PluginDiscoveryErrorType {
  IncompatibleVersion = 'incompatible-version',
  InvalidScanDirectory = 'invalid-scan-dir',
  InvalidPluginDirectory = 'invalid-plugin-dir',
  InvalidManifest = 'invalid-manifest',
  MissingManifest = 'missing-manifest',
}

export class PluginDiscoveryError extends Error {
  public static incompatibleVersion(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.IncompatibleVersion, path, cause);
  }

  public static invalidScanDirectory(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.InvalidScanDirectory, path, cause);
  }

  public static invalidPluginDirectory(path: string, cause: Error) {
    return new PluginDiscoveryError(PluginDiscoveryErrorType.InvalidPluginDirectory, path, cause);
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
