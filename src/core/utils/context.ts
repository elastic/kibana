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

import { flatten } from 'lodash';
import { pick } from '.';
import { CoreId, PluginOpaqueId } from '../server';

/**
 * A function that returns a context value for a specific key of given context type.
 *
 * @remarks
 * This function will be called each time a new context is built for a handler invocation.
 *
 * @param context - A partial context object containing only the keys for values provided by plugin dependencies
 * @param rest - Additional parameters provided by the service owner of this context
 * @returns The context value associated with this key. May also return a Promise which will be resolved before
 *          attaching to the context object.
 *
 * @public
 */
export type IContextProvider<
  TContext extends Record<string, any>,
  TContextName extends keyof TContext,
  TProviderParameters extends any[] = []
> = (
  context: Partial<TContext>,
  ...rest: TProviderParameters
) => Promise<TContext[TContextName]> | TContext[TContextName];

/**
 * A function registered by a plugin to perform some action.
 *
 * @remarks
 * A new `TContext` will be built for each handler before invoking.
 *
 * @public
 */
export type IContextHandler<TContext extends {}, TReturn, THandlerParameters extends any[] = []> = (
  context: TContext,
  ...rest: THandlerParameters
) => TReturn;

/**
 * An object that handles registration of context providers and configuring handlers with context.
 *
 * @remarks
 * A {@link IContextContainer} can be used by any Core service or plugin (known as the "service owner") which wishes to
 * expose APIs in a handler function. The container object will manage registering context providers and configuring a
 * handler with all of the contexts that should be exposed to the handler's plugin. This is dependent on the
 * dependencies that the handler's plugin declares.
 *
 * Contexts providers are executed in the order they were registered. Each provider gets access to context values
 * provided by any plugins that it depends on.
 *
 * In order to configure a handler with context, you must call the {@link IContextContainer.createHandler} function and
 * use the returned handler which will automatically build a context object when called.
 *
 * When registering context or creating handlers, the _calling plugin's opaque id_ must be provided. This id is passed
 * in via the plugin's initializer and can be accessed from the {@link PluginInitializerContext.opaqueId} Note this
 * should NOT be the context service owner's id, but the plugin that is actually registering the context or handler.
 *
 * ```ts
 * // Correct
 * class MyPlugin {
 *   private readonly handlers = new Map();
 *
 *   setup(core) {
 *     this.contextContainer = core.context.createContextContainer();
 *     return {
 *       registerContext(pluginOpaqueId, contextName, provider) {
 *         this.contextContainer.registerContext(pluginOpaqueId, contextName, provider);
 *       },
 *       registerRoute(pluginOpaqueId, path, handler) {
 *         this.handlers.set(
 *           path,
 *           this.contextContainer.createHandler(pluginOpaqueId, handler)
 *         );
 *       }
 *     }
 *   }
 * }
 *
 * // Incorrect
 * class MyPlugin {
 *   private readonly handlers = new Map();
 *
 *   constructor(private readonly initContext: PluginInitializerContext) {}
 *
 *   setup(core) {
 *     this.contextContainer = core.context.createContextContainer();
 *     return {
 *       registerContext(contextName, provider) {
 *         // BUG!
 *         // This would leak this context to all handlers rather that only plugins that depend on the calling plugin.
 *         this.contextContainer.registerContext(this.initContext.opaqueId, contextName, provider);
 *       },
 *       registerRoute(path, handler) {
 *         this.handlers.set(
 *           path,
 *           // BUG!
 *           // This handler will not receive any contexts provided by other dependencies of the calling plugin.
 *           this.contextContainer.createHandler(this.initContext.opaqueId, handler)
 *         );
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export interface IContextContainer<
  TContext extends {},
  THandlerReturn,
  THandlerParameters extends any[] = []
> {
  /**
   * Register a new context provider.
   *
   * @remarks
   * The value (or resolved Promise value) returned by the `provider` function will be attached to the context object
   * on the key specified by `contextName`.
   *
   * Throws an exception if more than one provider is registered for the same `contextName`.
   *
   * @param pluginOpaqueId - The plugin opaque ID for the plugin that registers this context.
   * @param contextName - The key of the `TContext` object this provider supplies the value for.
   * @param provider - A {@link IContextProvider} to be called each time a new context is created.
   * @returns The {@link IContextContainer} for method chaining.
   */
  registerContext<TContextName extends keyof TContext>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: TContextName,
    provider: IContextProvider<TContext, TContextName, THandlerParameters>
  ): this;

  /**
   * Create a new handler function pre-wired to context for the plugin.
   *
   * @param pluginOpaqueId - The plugin opaque ID for the plugin that registers this handler.
   * @param handler - Handler function to pass context object to.
   * @returns A function that takes `THandlerParameters`, calls `handler` with a new context, and returns a Promise of
   * the `handler` return value.
   */
  createHandler(
    pluginOpaqueId: PluginOpaqueId,
    handler: IContextHandler<TContext, THandlerReturn, THandlerParameters>
  ): (
    ...rest: THandlerParameters
  ) => THandlerReturn extends Promise<any> ? THandlerReturn : Promise<THandlerReturn>;
}

/** @internal */
export class ContextContainer<
  TContext extends Record<string, any>,
  THandlerReturn,
  THandlerParameters extends any[] = []
> implements IContextContainer<TContext, THandlerReturn, THandlerParameters> {
  /**
   * Used to map contexts to their providers and associated plugin. In registration order which is tightly coupled to
   * plugin load order.
   */
  private readonly contextProviders = new Map<
    keyof TContext,
    {
      provider: IContextProvider<TContext, keyof TContext, THandlerParameters>;
      source: symbol;
    }
  >();
  /** Used to keep track of which plugins registered which contexts for dependency resolution. */
  private readonly contextNamesBySource: Map<symbol, Array<keyof TContext>>;

  /**
   * @param pluginDependencies - A map of plugins to an array of their dependencies.
   */
  constructor(
    private readonly pluginDependencies: ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]>,
    private readonly coreId: CoreId
  ) {
    this.contextNamesBySource = new Map<symbol, Array<keyof TContext>>([[coreId, []]]);
  }

  public registerContext = <TContextName extends keyof TContext>(
    source: symbol,
    contextName: TContextName,
    provider: IContextProvider<TContext, TContextName, THandlerParameters>
  ): this => {
    if (this.contextProviders.has(contextName)) {
      throw new Error(`Context provider for ${contextName} has already been registered.`);
    }
    if (source !== this.coreId && !this.pluginDependencies.has(source)) {
      throw new Error(`Cannot register context for unknown plugin: ${source.toString()}`);
    }

    this.contextProviders.set(contextName, { provider, source });
    this.contextNamesBySource.set(source, [
      ...(this.contextNamesBySource.get(source) || []),
      contextName,
    ]);

    return this;
  };

  public createHandler = (
    source: symbol,
    handler: IContextHandler<TContext, THandlerReturn, THandlerParameters>
  ) => {
    if (source !== this.coreId && !this.pluginDependencies.has(source)) {
      throw new Error(`Cannot create handler for unknown plugin: ${source.toString()}`);
    }

    return (async (...args: THandlerParameters) => {
      const context = await this.buildContext(source, ...args);
      return handler(context, ...args);
    }) as (
      ...args: THandlerParameters
    ) => THandlerReturn extends Promise<any> ? THandlerReturn : Promise<THandlerReturn>;
  };

  private async buildContext(
    source: symbol,
    ...contextArgs: THandlerParameters
  ): Promise<TContext> {
    const contextsToBuild: ReadonlySet<keyof TContext> = new Set(
      this.getContextNamesForSource(source)
    );

    return [...this.contextProviders]
      .sort(sortByCoreFirst(this.coreId))
      .filter(([contextName]) => contextsToBuild.has(contextName))
      .reduce(
        async (contextPromise, [contextName, { provider, source: providerSource }]) => {
          const resolvedContext = await contextPromise;

          // For the next provider, only expose the context available based on the dependencies of the plugin that
          // registered that provider.
          const exposedContext = pick(resolvedContext, [
            ...this.getContextNamesForSource(providerSource),
          ]);

          return {
            ...resolvedContext,
            [contextName]: await provider(exposedContext as Partial<TContext>, ...contextArgs),
          };
        },
        Promise.resolve({}) as Promise<TContext>
      );
  }

  private getContextNamesForSource(source: symbol): ReadonlySet<keyof TContext> {
    if (source === this.coreId) {
      return this.getContextNamesForCore();
    } else {
      return this.getContextNamesForPluginId(source);
    }
  }

  private getContextNamesForCore() {
    return new Set(this.contextNamesBySource.get(this.coreId)!);
  }

  private getContextNamesForPluginId(pluginId: symbol) {
    // If the source is a plugin...
    const pluginDeps = this.pluginDependencies.get(pluginId);
    if (!pluginDeps) {
      // This case should never be hit, but let's be safe.
      throw new Error(`Cannot create context for unknown plugin: ${pluginId.toString()}`);
    }

    return new Set([
      // Core contexts
      ...this.contextNamesBySource.get(this.coreId)!,
      // Contexts source created
      ...(this.contextNamesBySource.get(pluginId) || []),
      // Contexts sources's dependencies created
      ...flatten(pluginDeps.map(p => this.contextNamesBySource.get(p) || [])),
    ]);
  }
}

/** Sorts context provider pairs by core pairs first. */
const sortByCoreFirst = (
  coreId: symbol
): ((left: [any, { source: symbol }], right: [any, { source: symbol }]) => number) => (
  [leftName, leftProvider],
  [rightName, rightProvider]
) => {
  if (leftProvider.source === coreId) {
    return rightProvider.source === coreId ? 0 : -1;
  } else {
    return rightProvider.source === coreId ? 1 : 0;
  }
};
