/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName } from '@kbn/core-base-common';

/**
 * Deferred (lazy) initialization helpers available to a plugin that has opted in via
 * `enableLazyInitialize: true` in its manifest.
 *
 * @public
 */
export interface LazyInitPluginsSetup {
  /**
   * Returns a promise that resolves once this plugin's deferred initialization is complete, or
   * rejects with a `DeferredInitializationError` if initialization ultimately fails.
   *
   * Call this at the start of a background task runner's `run` function (or inside a
   * `taskManager.addMiddleware` `beforeRun` hook) to gate task execution until the plugin is
   * ready. The task manager timeout still applies, so tasks that wait longer than their timeout
   * will be retried automatically.
   *
   * @example
   * ```ts
   * // In plugin setup:
   * const { waitForInit } = core.plugins.lazyInit!;
   * deps.taskManager.registerTaskDefinitions({
   *   'myPlugin:myTask': {
   *     createTaskRunner: (ctx) => ({
   *       run: async () => {
   *         await waitForInit();
   *         // ... actual task work
   *       },
   *     }),
   *   },
   * });
   * ```
   */
  waitForInit: () => Promise<void>;
}

/**
 * Setup contract of Core's `plugins` service.
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
   * Loads a single declared dependency's start contract, waiting for it to become safe to use:
   * the dependency's `start()` must have returned, and if it opted into deferred (lazy)
   * initialization, that initialization must have completed. Rejects with a
   * `DeferredInitializationError` (see `@kbn/core-plugins-server`) if the deferred
   * initialization ultimately fails.
   *
   * The dependency must be declared in the calling plugin's manifest (required, optional, or
   * `runtimePluginDependencies`), otherwise the API throws at call time.
   *
   * @example
   * ```ts
   * setup(core) {
   *   const fleetContract = await core.plugins.loadPluginContract<FleetStartContract>('fleet');
   *   await fleetContract.fleetSetupCompleted();
   * }
   * ```
   */
  loadPluginContract: LoadPluginContract;
  /**
   * Available only for plugins that have `enableLazyInitialize: true` in their manifest.
   * `undefined` for plugins without deferred initialization.
   *
   * @see {@link LazyInitPluginsSetup}
   */
  lazyInit?: LazyInitPluginsSetup;
}

/**
 * Start contract of Core's `plugins` service.
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
   * Loads a single declared dependency's start contract, waiting for it to become safe to use:
   * the dependency's `start()` must have returned, and if it opted into deferred (lazy)
   * initialization, that initialization must have completed. Rejects with a
   * `DeferredInitializationError` (see `@kbn/core-plugins-server`) if the deferred
   * initialization ultimately fails.
   *
   * The dependency must be declared in the calling plugin's manifest (required, optional, or
   * `runtimePluginDependencies`), otherwise the API throws at call time.
   *
   * @example
   * ```ts
   * start(core) {
   *   const fleetContract = await core.plugins.loadPluginContract<FleetStartContract>('fleet');
   *   await fleetContract.fleetSetupCompleted();
   * }
   * ```
   */
  loadPluginContract: LoadPluginContract;
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

/**
 * Loads a single declared dependency's start contract, typed by an explicit generic type
 * argument. See {@link PluginsServiceSetup.loadPluginContract} and
 * {@link PluginsServiceStart.loadPluginContract} for documentation and examples.
 *
 * @public
 */
export type LoadPluginContract = <T>(pluginName: PluginName) => Promise<T>;
