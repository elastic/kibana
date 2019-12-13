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
 * Logger interface used when invoking a {@link ConfigDeprecation}
 *
 * @public
 */
export type ConfigDeprecationLogger = (message: string) => void;

/**
 * Configuration deprecation returned from {@link ConfigDeprecationProvider} that handles a single deprecation from the configuration.
 *
 * @remarks
 * This should only be manually implemented if {@link ConfigDeprecationFactory} does not provide the proper helpers for a specific
 * deprecation need.
 *
 * @public
 */
export type ConfigDeprecation = (
  config: Record<string, any>,
  fromPath: string,
  logger: ConfigDeprecationLogger
) => Record<string, any>;

/**
 * A provider that should returns a list of {@link ConfigDeprecation}.
 *
 * See {@link ConfigDeprecationFactory} for more usage examples.
 *
 * @example
 * ```typescript
 * const provider: ConfigDeprecationProvider = ({ rename, unused }) => [
 *   rename('oldKey', 'newKey'),
 *   unused('deprecatedKey'),
 *   myCustomDeprecation,
 * ]
 * ```
 *
 * @public
 */
export type ConfigDeprecationProvider = (factory: ConfigDeprecationFactory) => ConfigDeprecation[];

/**
 * Provides helpers to generates the most commonly used {@link ConfigDeprecation}
 * when invoking a {@link ConfigDeprecationProvider}.
 *
 * See methods documentation for more detailed examples.
 *
 * @example
 * ```typescript
 * const provider: ConfigDeprecationProvider = ({ rename, unused }) => [
 *   rename('oldKey', 'newKey'),
 *   unused('deprecatedKey'),
 * ]
 * ```
 *
 * @public
 */
export interface ConfigDeprecationFactory {
  /**
   * Rename a configuration property from inside a plugin's configuration path.
   * Will log a deprecation warning if the oldKey was found and deprecation applied.
   *
   * @example
   * Rename 'myplugin.oldKey' to 'myplugin.newKey'
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ rename }) => [
   *   rename('oldKey', 'newKey'),
   * ]
   * ```
   */
  rename(oldKey: string, newKey: string): ConfigDeprecation;
  /**
   * Rename a configuration property from the root configuration.
   * Will log a deprecation warning if the oldKey was found and deprecation applied.
   *
   * This should be only used when renaming properties from different configuration's path.
   * To rename properties from inside a plugin's configuration, use 'rename' instead.
   *
   * @example
   * Rename 'oldplugin.key' to 'newplugin.key'
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ renameFromRoot }) => [
   *   renameFromRoot('oldplugin.key', 'newplugin.key'),
   * ]
   * ```
   */
  renameFromRoot(oldKey: string, newKey: string): ConfigDeprecation;
  /**
   * Remove a configuration property from inside a plugin's configuration path.
   * Will log a deprecation warning if the unused key was found and deprecation applied.
   *
   * @example
   * Flags 'myplugin.deprecatedKey' as unused
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ unused }) => [
   *   unused('deprecatedKey'),
   * ]
   * ```
   */
  unused(unusedKey: string): ConfigDeprecation;
  /**
   * Remove a configuration property from the root configuration.
   * Will log a deprecation warning if the unused key was found and deprecation applied.
   *
   * This should be only used when removing properties from outside of a plugin's configuration.
   * To remove properties from inside a plugin's configuration, use 'unused' instead.
   *
   * @example
   * Flags 'somepath.deprecatedProperty' as unused
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ unusedFromRoot }) => [
   *   unusedFromRoot('somepath.deprecatedProperty'),
   * ]
   * ```
   */
  unusedFromRoot(unusedKey: string): ConfigDeprecation;
}

/** @internal */
export interface ConfigDeprecationWithContext {
  deprecation: ConfigDeprecation;
  path: string;
}
