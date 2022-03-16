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
  /** The path of the deprecated config setting */
  configPath: string;
  /** The title to be displayed for the deprecation. */
  title?: string;
  /** The message to be displayed for the deprecation. */
  message: string;
  /**
   * levels:
   * - warning: will not break deployment upon upgrade
   * - critical: needs to be addressed before upgrade.
   */
  level: 'warning' | 'critical';
  /** (optional) set to `true` to prevent the config service from logging the deprecation message. */
  silent?: boolean;
  /** (optional) link to the documentation for more details on the deprecation. */
  documentationUrl?: string;
  /** corrective action needed to fix this deprecation. */
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
 * @public
 */
export type ConfigDeprecation = (
  config: RecursiveReadonly<Record<string, any>>,
  fromPath: string,
  addDeprecation: AddConfigDeprecation,
  context: ConfigDeprecationContext
) => void | ConfigDeprecationCommand;

/**
 * Deprecation context provided to {@link ConfigDeprecation | config deprecations}
 *
 * @public
 */
export interface ConfigDeprecationContext {
  /** The current Kibana version, e.g `7.16.1`, `8.0.0` */
  version: string;
  /** The current Kibana branch, e.g `7.x`, `7.16`, `master` */
  branch: string;
}

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
 * const provider: ConfigDeprecationProvider = ({ deprecate, rename, unused }) => [
 *   deprecate('deprecatedKey', '8.0.0', { level: 'warning' }),
 *   rename('oldKey', 'newKey', { level: 'warning' }),
 *   unused('deprecatedKey', { level: 'warning' }),
 *   (config, path) => ({ unset: [{ key: 'path.to.key' }] })
 * ]
 * ```
 *
 * @public
 */
export type ConfigDeprecationProvider = (factory: ConfigDeprecationFactory) => ConfigDeprecation[];

/** @public */
export type FactoryConfigDeprecationDetails = Pick<DeprecatedConfigDetails, 'level'> &
  Partial<Omit<DeprecatedConfigDetails, 'level'>>;

/**
 * Provides helpers to generates the most commonly used {@link ConfigDeprecation}
 * when invoking a {@link ConfigDeprecationProvider}.
 *
 * See methods documentation for more detailed examples.
 *
 * @example
 * ```typescript
 * const provider: ConfigDeprecationProvider = ({ rename, unused }) => [
 *   rename('oldKey', 'newKey', { level: 'critical' }),
 *   unused('deprecatedKey', { level: 'warning' }),
 * ]
 * ```
 *
 * @public
 */

export interface ConfigDeprecationFactory {
  /**
   * Deprecate a configuration property from inside a plugin's configuration path.
   * Will log a deprecation warning if the deprecatedKey was found.
   *
   * @example
   * Log a deprecation warning indicating 'myplugin.deprecatedKey' should be removed by `8.0.0`
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ deprecate }) => [
   *   deprecate('deprecatedKey', '8.0.0', { level: 'critical' }),
   * ]
   * ```
   */
  deprecate(
    deprecatedKey: string,
    removeBy: string,
    details: FactoryConfigDeprecationDetails
  ): ConfigDeprecation;

  /**
   * Deprecate a configuration property from the root configuration.
   * Will log a deprecation warning if the deprecatedKey was found.
   *
   * This should be only used when deprecating properties from different configuration's path.
   * To deprecate properties from inside a plugin's configuration, use 'deprecate' instead.
   *
   * @example
   * Log a deprecation warning indicating 'myplugin.deprecatedKey' should be removed by `8.0.0`
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ deprecateFromRoot }) => [
   *   deprecateFromRoot('deprecatedKey', '8.0.0', { level: 'critical' }),
   * ]
   * ```
   */
  deprecateFromRoot(
    deprecatedKey: string,
    removeBy: string,
    details: FactoryConfigDeprecationDetails
  ): ConfigDeprecation;

  /**
   * Rename a configuration property from inside a plugin's configuration path.
   * Will log a deprecation warning if the oldKey was found and deprecation applied.
   *
   * @example
   * Rename 'myplugin.oldKey' to 'myplugin.newKey'
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ rename }) => [
   *   rename('oldKey', 'newKey', { level: 'warning' }),
   * ]
   * ```
   *
   * @remarks
   * If the oldKey is a nested property and it's the last property in an object, it may remove any empty-object parent keys.
   * ```
   * // Original object
   * {
   * 	a: {
   * 		b: { c: 1 },
   * 		d: { e: 1 }
   * 	}
   * }
   *
   * // If rename('a.b.c', 'a.d.c'), the resulting object removes the entire "a.b" tree because "c" was the last property in that branch
   * {
   * 	a: {
   * 		d: { c: 1, e: 1 }
   * 	}
   * }
   * ```
   */
  rename(
    oldKey: string,
    newKey: string,
    details: FactoryConfigDeprecationDetails
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
   *   renameFromRoot('oldplugin.key', 'newplugin.key', { level: 'critical' }),
   * ]
   * ```
   *
   * @remarks
   * If the oldKey is a nested property and it's the last property in an object, it may remove any empty-object parent keys.
   * ```
   * // Original object
   * {
   * 	a: {
   * 		b: { c: 1 },
   * 		d: { e: 1 }
   * 	}
   * }
   *
   * // If renameFromRoot('a.b.c', 'a.d.c'), the resulting object removes the entire "a.b" tree because "c" was the last property in that branch
   * {
   * 	a: {
   * 		d: { c: 1, e: 1 }
   * 	}
   * }
   * ```
   */
  renameFromRoot(
    oldKey: string,
    newKey: string,
    details: FactoryConfigDeprecationDetails
  ): ConfigDeprecation;

  /**
   * Remove a configuration property from inside a plugin's configuration path.
   * Will log a deprecation warning if the unused key was found and deprecation applied.
   *
   * @example
   * Flags 'myplugin.deprecatedKey' as unused
   * ```typescript
   * const provider: ConfigDeprecationProvider = ({ unused }) => [
   *   unused('deprecatedKey', { level: 'warning' }),
   * ]
   * ```
   *
   * @remarks
   * If the path is a nested property and it's the last property in an object, it may remove any empty-object parent keys.
   * ```
   * // Original object
   * {
   * 	a: {
   * 		b: { c: 1 },
   * 		d: { e: 1 }
   * 	}
   * }
   *
   * // If unused('a.b.c'), the resulting object removes the entire "a.b" tree because "c" was the last property in that branch
   * {
   * 	a: {
   * 		d: { e: 1 }
   * 	}
   * }
   * ```
   */
  unused(unusedKey: string, details: FactoryConfigDeprecationDetails): ConfigDeprecation;

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
   *   unusedFromRoot('somepath.deprecatedProperty', { level: 'warning' }),
   * ]
   * ```
   *
   * @remarks
   * If the path is a nested property and it's the last property in an object, it may remove any empty-object parent keys.
   * ```
   * // Original object
   * {
   * 	a: {
   * 		b: { c: 1 },
   * 		d: { e: 1 }
   * 	}
   * }
   *
   * // If unused('a.b.c'), the resulting object removes the entire "a.b" tree because "c" was the last property in that branch
   * {
   * 	a: {
   * 		d: { e: 1 }
   * 	}
   * }
   * ```
   */
  unusedFromRoot(unusedKey: string, details: FactoryConfigDeprecationDetails): ConfigDeprecation;
}

/** @internal */
export interface ConfigDeprecationWithContext {
  deprecation: ConfigDeprecation;
  path: string;
  context: ConfigDeprecationContext;
}
