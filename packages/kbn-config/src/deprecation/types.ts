/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  renameFromRoot(oldKey: string, newKey: string, silent?: boolean): ConfigDeprecation;
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
