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
 * An object that handles registration of context providers and building of new context objects.
 *
 * @remarks
 * A `ContextContainer` can be used by any Core service or plugin (known as the "service owner") which wishes to expose
 * APIs in a handler function. The container object will manage registering context providers and building a context
 * object for a handler with all of the contexts that should be exposed to the handler's plugin. This is dependent on
 * the dependencies that the handler's plugin declares.
 *
 * Contexts providers are executed in the order they were registered. Each provider gets access to context values
 * provided by any plugins that it depends on.
 *
 *
 * @public
 */
export interface ContextContainer<
  TContext extends {},
  THandlerReturn,
  THandlerParameters extends any[] = []
> {
  /**
   * Register a new context provider. Throws an exception if more than one provider is registered for the same context
   * key.
   *
   * @param contextName - The key of the `TContext` object this provider supplies the value for.
   * @param provider - A {@link ContextProvider} to be called each time a new context is created.
   * @returns The `ContextContainer` for method chaining.
   */
  registerContext<TContextName extends keyof TContext>(
    contextName: TContextName,
    provider: ContextProvider<TContext, TContextName, THandlerParameters>
  ): this;

  /**
   * Create a new handler function pre-wired to context for the plugin.
   *
   * @remarks
   * This must be called when the handler is registered by the consuming plugin. If this is called later in the
   * lifecycle it will throw an exception.
   *
   * @param handler
   */
  createHandler(
    handler: Handler<TContext, THandlerReturn, THandlerParameters>
  ): (...rest: THandlerParameters) => Promisify<THandlerReturn>;
}

/** @internal */
export class ContextContainerImplementation<
  TContext extends {},
  THandlerReturn,
  THandlerParameters extends any[] = []
> implements ContextContainer<TContext, THandlerReturn, THandlerParameters> {
  private currentPlugin?: string;

  /**
   * Used to map contexts to their providers and associated plugin. In registration order which is tightly coupled to
   * plugin load order.
   */
  private readonly contextProviders = new Map<
    keyof TContext,
    {
      provider: ContextProvider<TContext, keyof TContext, THandlerParameters>;
      plugin?: PluginName;
    }
  >();
  /** Used to keep track of which plugins registered which contexts for dependency resolution. */
  private readonly contextNamesByPlugin = new Map<PluginName, Array<keyof TContext>>();

  /**
   * @param pluginDependencies - A map of plugins to an array of their dependencies.
   */
  constructor(private readonly pluginDependencies: ReadonlyMap<PluginName, PluginName[]>) {}

  public registerContext = <TContextName extends keyof TContext>(
    contextName: TContextName,
    provider: ContextProvider<TContext, TContextName, THandlerParameters>
  ): this => {
    if (this.contextProviders.has(contextName)) {
      throw new Error(`Context provider for ${contextName} has already been registered.`);
    }

    const plugin = this.currentPlugin;
    this.contextProviders.set(contextName, { provider, plugin });

    if (plugin) {
      this.contextNamesByPlugin.set(plugin, [
        ...(this.contextNamesByPlugin.get(plugin) || []),
        contextName,
      ]);
    }

    return this;
  };

  public createHandler = (handler: Handler<TContext, THandlerReturn, THandlerParameters>) => {
    const plugin = this.currentPlugin;
    if (!plugin) {
      throw new Error(`Cannot create handlers outside a plugin!`);
    } else if (!this.pluginDependencies.has(plugin)) {
      throw new Error(`Cannot create handler for unknown plugin: ${plugin}`);
    }

    return (async (...args: THandlerParameters) => {
      const context = await this.buildContext(plugin, {}, ...args);
      return handler(context, ...args);
    }) as (...args: THandlerParameters) => Promisify<THandlerReturn>;
  };

  private async buildContext(
    pluginName: PluginName,
    baseContext: Partial<TContext> = {},
    ...contextArgs: THandlerParameters
  ): Promise<TContext> {
    const ownerContextNames = [...this.contextProviders]
      .filter(([name, { plugin }]) => plugin === undefined)
      .map(([name]) => name);
    const contextNamesForPlugin = (plug: PluginName): Set<keyof TContext> => {
      const pluginDeps = this.pluginDependencies.get(plug);
      if (!pluginDeps) {
        // This should be impossible, but just in case.
        throw new Error(`Cannot create context for unknown plugin: ${pluginName}`);
      }

      return new Set([
        // Owner contexts
        ...ownerContextNames,
        // Contexts calling plugin created
        ...(this.contextNamesByPlugin.get(pluginName) || []),
        // Contexts calling plugin's dependencies created
        ...flatten(pluginDeps.map(p => this.contextNamesByPlugin.get(p) || [])),
      ]);
    };

    const contextsToBuild = contextNamesForPlugin(pluginName);

    return [...this.contextProviders]
      .filter(([contextName]) => contextsToBuild.has(contextName))
      .reduce(
        async (contextPromise, [contextName, { provider, plugin }]) => {
          const resolvedContext = await contextPromise;

          // If the provider is not from a plugin, give access to the entire
          // context built so far (this is only possible for providers registered
          // by the service owner).
          const exposedContext = plugin
            ? pick(resolvedContext, [...contextNamesForPlugin(plugin)])
            : resolvedContext;

          return {
            ...resolvedContext,
            [contextName]: await provider(exposedContext as Partial<TContext>, ...contextArgs),
          };
        },
        Promise.resolve(baseContext) as Promise<TContext>
      );
  }

  /** @internal */
  public setCurrentPlugin(plugin?: string) {
    this.currentPlugin = plugin;
  }
}
