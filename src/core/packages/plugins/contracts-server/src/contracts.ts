/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { PluginName } from '@kbn/core-base-common';
import type { PluginInitStatus } from '@kbn/core-deferred-init-common';

/**
 * Setup contract of Core's `plugins` service.
 *
 * Besides the runtime contract resolvers, it carries the cross-plugin initialization API
 * (`initializePlugin`, `pluginInitStatus$`, `getPluginInitStatus`). Core alone decides when a
 * plugin's `initialize()` runs (`plugins.initializeOnBoot`: at boot by default, otherwise on
 * first use); these functions let a dependent wait for, or observe, a declared dependency's
 * initialization on this Kibana instance without caring which mode core is in.
 *
 * @public
 */
export interface PluginsServiceSetup {
  /**
   * Returns a promise that will resolve with the requested plugin setup contracts once all plugins have been set up.
   *
   * If called when plugins are already setup, the returned promise will resolve instantly.
   *
   * The API can only be used to resolve required dependencies, optional dependencies, or dependencies explicitly
   * defined as `runtimePluginDependencies` in the calling plugin's manifest, otherwise the API will throw at call time.
   *
   * **Important:** This API should only be used when trying to address cyclic dependency issues that can't easily
   * be solved otherwise. This is meant to be a temporary workaround only supposed to be used until a better solution
   * is made available.
   * Therefore, by using this API, you implicitly agree to:
   * - consider it as technical debt and open an issue to track the tech debt resolution
   * - accept that this is only a temporary solution, and will comply to switching to the long term solution when asked by the Core team
   *
   * @remark The execution order is not guaranteed to be consistent. Only guarantee is that the returned promise will be
   *         resolved once all plugins are started, and before Core's `start` lifecycle is resumed.
   *
   * @example
   * ```ts
   * setup(core) {
   *   core.plugins.onSetup<{pluginA: SetupContractA, pluginB: SetupContractA}>('pluginA', 'pluginB')
   *       .then(({ pluginA, pluginB }) => {
   *         if(pluginA.found && pluginB.found) {
   *           // do something with pluginA.contract and pluginB.contract
   *         }
   *       });
   * }
   *
   * @experimental
   * ```
   */
  onSetup: PluginContractResolver;
  /**
   * Returns a promise that will resolve with the requested plugin start contracts once all plugins have been started.
   *
   * If called when plugins are already started, the returned promise will resolve instantly.
   *
   * The API can only be used to resolve required dependencies, optional dependencies, or dependencies explicitly
   * defined as `runtimePluginDependencies` in the calling plugin's manifest, otherwise the API will throw at call time.
   *
   * **Important:** This API should only be used when trying to address cyclic dependency issues that can't easily
   * be solved otherwise. This is meant to be a temporary workaround only supposed to be used until a better solution
   * is made available.
   * Therefore, by using this API, you implicitly agree to:
   * - consider it as technical debt and open an issue to track the tech debt resolution
   * - accept that this is only a temporary solution, and will comply to switching to the long term solution when asked by the Core team
   *
   * @remark The execution order is not guaranteed to be consistent. Only guarantee is that the returned promise will be
   *         resolved once all plugins are started, and before Core's `start` lifecycle is resumed.
   *
   * @example
   * ```ts
   * setup(core) {
   *   core.plugins.onStart<{pluginA: StartContractA, pluginB: StartContractA}>('pluginA', 'pluginB')
   *       .then(({ pluginA, pluginB }) => {
   *         if(pluginA.found && pluginB.found) {
   *           // do something with pluginA.contract and pluginB.contract
   *         }
   *       });
   * }
   *
   * @experimental
   * ```
   */
  onStart: PluginContractResolver;
  /**
   * Make sure a declared dependency is initialized. `pluginName` must be listed in this
   * plugin's manifest (`requiredPlugins`, `optionalPlugins` or `runtimePluginDependencies`),
   * otherwise it throws.
   *
   * Resolves once the dependency's `initialize()` has succeeded on this instance and joins
   * an attempt already in flight. When the dependency's last attempt failed and a retry is
   * scheduled, it waits for that retry rather than forcing one; once background retries are
   * exhausted it starts a new attempt. Rejects with a {@link PluginInitializationError} on
   * failure, and rejects when called during `setup` or `start`, where awaiting it would
   * block boot. Dependencies without `initialize()` resolve once they have started; a
   * disabled or absent dependency rejects. When core has not run the dependency's
   * `initialize()` at boot (`plugins.initializeOnBoot: false`), this call is one of the
   * triggers that starts it.
   */
  initializePlugin: (pluginName: PluginName) => Promise<void>;
  /**
   * Status of a declared dependency's initialization. Never triggers anything and replays
   * the current value. Dependencies without `initialize()` report `available` once started;
   * disabled or absent plugins report `idle`.
   */
  pluginInitStatus$: (pluginName: PluginName) => Observable<PluginInitStatus>;
  /** Current value of `pluginInitStatus$`, synchronous. Never triggers anything. */
  getPluginInitStatus: (pluginName: PluginName) => PluginInitStatus;
}

/**
 * Start contract of Core's `plugins` service.
 *
 * Besides the runtime contract resolvers, it carries the cross-plugin initialization API
 * (`initializePlugin`, `pluginInitStatus$`, `getPluginInitStatus`). Core alone decides when a
 * plugin's `initialize()` runs (`plugins.initializeOnBoot`: at boot by default, otherwise on
 * first use); these functions let a dependent wait for, or observe, a declared dependency's
 * initialization on this Kibana instance without caring which mode core is in.
 *
 * @public
 */
export interface PluginsServiceStart {
  /**
   * Returns a promise that will resolve with the requested plugin start contracts once all plugins have been started.
   *
   * If called when plugins are already started, the returned promise will resolve instantly.
   *
   * The API can only be used to resolve required dependencies, optional dependencies, or dependencies explicitly
   * defined as `runtimePluginDependencies` in the calling plugin's manifest, otherwise the API will throw at call time.
   *
   * **Important:** This API should only be used when trying to address cyclic dependency issues that can't easily
   * be solved otherwise. This is meant to be a temporary workaround only supposed to be used until a better solution
   * is made available.
   * Therefore, by using this API, you implicitly agree to:
   * - consider it as technical debt and open an issue to track the tech debt resolution
   * - accept that this is only a temporary solution, and will comply to switching to the long term solution when asked by the Core team
   *
   * @remark The execution order is not guaranteed to be consistent. Only guarantee is that the returned promise will be
   *         resolved once all plugins are started, and before Core's `start` lifecycle is resumed.
   *
   * @example
   * ```ts
   * start(core) {
   *   core.plugins.onStart<{pluginA: StartContractA, pluginB: StartContractA}>('pluginA', 'pluginB')
   *       .then(({ pluginA, pluginB }) => {
   *         if(pluginA.found && pluginB.found) {
   *           // do something with pluginA.contract and pluginB.contract
   *         }
   *       });
   * }
   * ```
   *
   * @experimental
   */
  onStart: PluginContractResolver;
  /**
   * Make sure a declared dependency is initialized. `pluginName` must be listed in this
   * plugin's manifest (`requiredPlugins`, `optionalPlugins` or `runtimePluginDependencies`),
   * otherwise it throws.
   *
   * Resolves once the dependency's `initialize()` has succeeded on this instance and joins
   * an attempt already in flight. When the dependency's last attempt failed and a retry is
   * scheduled, it waits for that retry rather than forcing one; once background retries are
   * exhausted it starts a new attempt. Rejects with a {@link PluginInitializationError} on
   * failure, and rejects when called during `setup` or `start`, where awaiting it would
   * block boot. Dependencies without `initialize()` resolve once they have started; a
   * disabled or absent dependency rejects. When core has not run the dependency's
   * `initialize()` at boot (`plugins.initializeOnBoot: false`), this call is one of the
   * triggers that starts it.
   */
  initializePlugin: (pluginName: PluginName) => Promise<void>;
  /**
   * Status of a declared dependency's initialization. Never triggers anything and replays
   * the current value. Dependencies without `initialize()` report `available` once started;
   * disabled or absent plugins report `idle`.
   */
  pluginInitStatus$: (pluginName: PluginName) => Observable<PluginInitStatus>;
  /** Current value of `pluginInitStatus$`, synchronous. Never triggers anything. */
  getPluginInitStatus: (pluginName: PluginName) => PluginInitStatus;
}

/**
 * Contract resolver response for found plugins.
 *
 * @see {@link PluginContractResolverResponseItem}
 * @public
 */
export interface FoundPluginContractResolverResponseItem<ContractType = unknown> {
  found: true;
  contract: ContractType;
}

/**
 * Contract resolver response for not found plugins.
 *
 * @see {@link PluginContractResolverResponseItem}
 * @public
 */
export interface NotFoundPluginContractResolverResponseItem {
  found: false;
}

/**
 * Contract resolver response.
 *
 * @see {@link PluginContractResolver}
 * @public
 */
export type PluginContractResolverResponseItem<ContractType = unknown> =
  | NotFoundPluginContractResolverResponseItem
  | FoundPluginContractResolverResponseItem<ContractType>;

/**
 * A record of plugin contracts.
 *
 * @see {@link PluginContractResolver}
 * @public
 */
export type PluginContractMap = Record<PluginName, unknown>;

/**
 * Response from a plugin contract resolver request.
 *
 * @see {@link PluginContractResolver}
 * @public
 */
export type PluginContractResolverResponse<ContractMap extends PluginContractMap> = {
  [Key in keyof ContractMap]: PluginContractResolverResponseItem<ContractMap[Key]>;
};

/**
 * A plugin contract resolver, allowing to retrieve plugin contracts at runtime.
 *
 * Please refer to {@link PluginsServiceSetup} and {@link PluginsServiceStart} for more documentation and examples.
 *
 * @public
 */
export type PluginContractResolver = <T extends PluginContractMap>(
  ...pluginNames: Array<keyof T>
) => Promise<PluginContractResolverResponse<T>>;
