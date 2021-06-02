/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RecursiveReadonly } from '@kbn/utility-types';
/**
 * Config deprecation hook used when invoking a {@link ConfigDeprecation}
 *
 * @public
 */
export type AddConfigDeprecation = (details: DeprecatedConfigDetails) => void;

/**
 * Deprecated Config Details
 *
 * @public
 */
export interface DeprecatedConfigDetails {
  /* The message to be displayed for the deprecation. */
  message: string;
  /* (optional) set false to prevent the config service from logging the deprecation message. */
  silent?: boolean;
  /* (optional) link to the documentation for more details on the deprecation. */
  documentationUrl?: string;
  /* corrective action needed to fix this deprecation. */
  correctiveActions: {
    /**
     * Specify a list of manual steps our users need to follow
     * to fix the deprecation before upgrade.
     */
    manualSteps: string[];
  };
}

/**
 * Configuration deprecation returned from {@link ConfigDeprecationProvider} that handles a single deprecation from the configuration.
 *
 * @remarks
 * This should only be manually implemented if {@link ConfigDeprecationFactory} does not provide the proper helpers for a specific
 * deprecation need.
 * @param config must not be mutated, return {@link ConfigDeprecationCommand} to change config shape.
 *
 * @example
 * ```typescript
 * const provider: ConfigDeprecation = (config, path) => ({ unset: [{ key: 'path.to.key' }] })
 * ```
 * @internal
 */
export type ConfigDeprecation = (
  config: RecursiveReadonly<Record<string, any>>,
  fromPath: string,
  addDeprecation: AddConfigDeprecation
) => void | ConfigDeprecationCommand;

/**
 * List of config paths changed during deprecation.
 *
 * @public
 */
export interface ChangedDeprecatedPaths {
  set: string[];
  unset: string[];
}

/**
 * Outcome of deprecation operation. Allows mutating config values in a declarative way.
 *
 * @public
 */
export interface ConfigDeprecationCommand {
  set?: Array<{ path: string; value: any }>;
  unset?: Array<{ path: string }>;
}

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
 *   (config, path) => ({ unset: [{ key: 'path.to.key' }] })
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
  rename(
    oldKey: string,
    newKey: string,
    details?: Partial<DeprecatedConfigDetails>
  ): ConfigDeprecation;
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
  renameFromRoot(
    oldKey: string,
    newKey: string,
    details?: Partial<DeprecatedConfigDetails>
  ): ConfigDeprecation;
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
  unused(unusedKey: string, details?: Partial<DeprecatedConfigDetails>): ConfigDeprecation;
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
  unusedFromRoot(unusedKey: string, details?: Partial<DeprecatedConfigDetails>): ConfigDeprecation;
}

/** @internal */
export interface ConfigDeprecationWithContext {
  deprecation: ConfigDeprecation;
  path: string;
}
