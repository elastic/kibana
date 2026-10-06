/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @internal */
export declare enum PluginDiscoveryErrorType {
  IncompatibleVersion = 'incompatible-version',
  InvalidSearchPath = 'invalid-search-path',
  InvalidPluginPath = 'invalid-plugin-path',
  InvalidManifest = 'invalid-manifest',
  MissingManifest = 'missing-manifest',
}
/** @internal */
export declare class PluginDiscoveryError extends Error {
  readonly type: PluginDiscoveryErrorType;
  readonly path: string;
  readonly cause: Error;
  static incompatibleVersion(path: string, cause: Error): PluginDiscoveryError;
  static invalidSearchPath(path: string, cause: Error): PluginDiscoveryError;
  static invalidPluginPath(path: string, cause: Error): PluginDiscoveryError;
  static invalidManifest(path: string, cause: Error): PluginDiscoveryError;
  static missingManifest(path: string, cause: Error): PluginDiscoveryError;
  /**
   * @param type Type of the discovery error (invalid directory, invalid manifest etc.)
   * @param path Path at which discovery error occurred.
   * @param cause "Raw" error object that caused discovery error.
   */
  constructor(type: PluginDiscoveryErrorType, path: string, cause: Error);
}
