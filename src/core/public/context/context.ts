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
import { PluginName } from '../../server';
import { pick } from '../../utils';
import { CoreId } from '../core_system';

/**
 * A function that returns a context value for a specific key of given context type.
 *
 * @remarks
 * This function will be called each time a new context is built for a handler invocation.
 *
 * @param context - A partial context object containing only the keys for values provided by plugin dependencies
 * @param rest - Additional parameters provided by the service owner of this context
 * @returns The context value associated with this key. May also return a Promise.
 *
 * @public
 */
export type ContextProvider<
  TContext extends {},
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
export type Handler<TContext extends {}, TReturn, THandlerParameters extends any[] = []> = (
  context: TContext,
  ...rest: THandlerParameters
) => TReturn;

type Promisify<T> = T extends Promise<infer U> ? Promise<U> : Promise<T>;

/**
 * An object that handles registration of context providers and configuring handlers with context.
 *
 * @remarks
 * A {@link ContextContainer} can be used by any Core service or plugin (known as the "service owner") which wishes to
 * expose APIs in a handler function. The container object will manage registering context providers and configuring a
 * handler with all of the contexts that should be exposed to the handler's plugin. This is dependent on the
 * dependencies that the handler's plugin declares.
 *
 * Contexts providers are executed in the order they were registered. Each provider gets access to context values
 * provided by any plugins that it depends on.
 *
 * In order to configure a handler with context, you must call the {@link ContextContainer.createHandler} function and
 * use the returned handler which will automatically build a context object when called.
 *
 * When registering context or creating handlers, the _calling plugin's id_ must be provided. Note this should NOT be
 * the context service owner, but the plugin that is actually registering the context or handler.
 *
 * ```ts
 * // GOOD
 * class MyPlugin {
 *   private readonly handlers = new Map();
 *
 *   setup(core) {
 *     this.contextContainer = core.context.createContextContainer();
 *     return {
 *       registerContext(plugin, contextName, provider) {
 *         this.contextContainer.registerContext(plugin, contextName, provider);
 *       },
 *       registerRoute(plugin, path, handler) {
 *         this.handlers.set(
 *           path,
 *           this.contextContainer.createHandler(plugin, handler)
 *         );
 *       }
 *     }
 *   }
 * }
 *
 * // BAD
 * class MyPlugin {
 *   private readonly handlers = new Map();
 *
 *   setup(core) {
 *     this.contextContainer = core.context.createContextContainer();
 *     return {
 *       registerContext(plugin, contextName, provider) {
 *         // This would leak this context to all handlers rather tha only plugins that depend on the calling plugin.
 *         this.contextContainer.registerContext('my_plugin', contextName, provider);
 *       },
 *       registerRoute(plugin, path, handler) {
 *         this.handlers.set(
 *           path,
 *           // the handler will not receive any contexts provided by other dependencies of the calling plugin.
 *           this.contextContainer.createHandler('my_plugin', handler)
 *         );
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export interface ContextContainer<
  TContext extends {},
  THandlerReturn,
  THandlerParameters extends any[] = []
> {
  /**
   * Register a new context provider. Throws an exception if more than one provider is registered for the same
   * `contextName`.
   *
   * @param plugin - The plugin ID for the plugin that registers this context.
   * @param contextName - The key of the `TContext` object this provider supplies the value for.
   * @param provider - A {@link ContextProvider} to be called each time a new context is created.
   * @returns The `ContextContainer` for method chaining.
   */
  registerContext<TContextName extends keyof TContext>(
    plugin: string | CoreId,
    contextName: TContextName,
    provider: ContextProvider<TContext, TContextName, THandlerParameters>
  ): this;

  /**
   * Create a new handler function pre-wired to context for the plugin.
   *
   * @param plugin - The plugin ID for the plugin that registers this context.
   * @param handler
   * @returns A function that takes `THandlerParameters`, calls `handler` with a new context, and returns a Promise of
   * the `handler` return value.
   */
  createHandler(
    plugin: string | CoreId,
    handler: Handler<TContext, THandlerReturn, THandlerParameters>
  ): (...rest: THandlerParameters) => Promisify<THandlerReturn>;
}

type ContextSource = PluginName | CoreId;

/** @internal */
export class ContextContainerImplementation<
  TContext extends {},
  THandlerReturn,
  THandlerParameters extends any[] = []
> implements ContextContainer<TContext, THandlerReturn, THandlerParameters> {
  /**
   * Used to map contexts to their providers and associated plugin. In registration order which is tightly coupled to
   * plugin load order.
   */
  private readonly contextProviders = new Map<
    keyof TContext,
    {
      provider: ContextProvider<TContext, keyof TContext, THandlerParameters>;
      source: ContextSource;
    }
  >();
  /** Used to keep track of which plugins registered which contexts for dependency resolution. */
  private readonly contextNamesBySource: Map<ContextSource, Array<keyof TContext>>;

  /**
   * @param pluginDependencies - A map of plugins to an array of their dependencies.
   */
  constructor(
    private readonly pluginDependencies: ReadonlyMap<PluginName, PluginName[]>,
    private readonly coreId: CoreId
  ) {
    this.contextNamesBySource = new Map<ContextSource, Array<keyof TContext>>([[coreId, []]]);
  }

  public registerContext = <TContextName extends keyof TContext>(
    source: ContextSource,
    contextName: TContextName,
    provider: ContextProvider<TContext, TContextName, THandlerParameters>
  ): this => {
    if (this.contextProviders.has(contextName)) {
      throw new Error(`Context provider for ${contextName} has already been registered.`);
    }

    if (typeof source === 'symbol' && source !== this.coreId) {
      throw new Error(`Symbol only allowed for core services`);
    }

    this.contextProviders.set(contextName, { provider, source });
    this.contextNamesBySource.set(source, [
      ...(this.contextNamesBySource.get(source) || []),
      contextName,
    ]);

    return this;
  };

  public createHandler = (
    source: ContextSource,
    handler: Handler<TContext, THandlerReturn, THandlerParameters>
  ) => {
    if (typeof source === 'symbol' && source !== this.coreId) {
      throw new Error(`Symbol only allowed for core services`);
    } else if (typeof source === 'string' && !this.pluginDependencies.has(source)) {
      throw new Error(`Cannot create handler for unknown plugin: ${source}`);
    }

    return (async (...args: THandlerParameters) => {
      const context = await this.buildContext(source, {}, ...args);
      return handler(context, ...args);
    }) as (...args: THandlerParameters) => Promisify<THandlerReturn>;
  };

  private async buildContext(
    source: ContextSource,
    baseContext: Partial<TContext> = {},
    ...contextArgs: THandlerParameters
  ): Promise<TContext> {
    const contextsToBuild = new Set(this.contextNamesForSource(source));

    return [...this.contextProviders]
      .filter(([contextName]) => contextsToBuild.has(contextName))
      .reduce(
        async (contextPromise, [contextName, { provider, source: providerSource }]) => {
          const resolvedContext = await contextPromise;

          // For the next provider, only expose the context available based on the dependencies.
          const exposedContext = pick(resolvedContext, this.contextNamesForSource(providerSource));

          return {
            ...resolvedContext,
            [contextName]: await provider(exposedContext as Partial<TContext>, ...contextArgs),
          };
        },
        Promise.resolve(baseContext) as Promise<TContext>
      );
  }

  private contextNamesForSource(source: ContextSource): Array<keyof TContext> {
    // If the source is core...
    if (typeof source === 'symbol') {
      if (source !== this.coreId) {
        // This case should never be hit.
        throw new Error(`Cannot build context for symbol`);
      }

      return this.contextNamesBySource.get(this.coreId)!;
    }

    // If the source is a plugin...
    const pluginDeps = this.pluginDependencies.get(source);
    if (!pluginDeps) {
      // This case should never be hit.
      throw new Error(`Cannot create context for unknown plugin: ${source}`);
    }

    return [
      // Core contexts
      ...this.contextNamesBySource.get(this.coreId)!,
      // Contexts source created
      ...(this.contextNamesBySource.get(source) || []),
      // Contexts sources's dependencies created
      ...flatten(pluginDeps.map(p => this.contextNamesBySource.get(p) || [])),
    ];
  }
}
