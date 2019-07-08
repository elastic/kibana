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
 * An object that handles registration of context providers and building of new context objects.
 *
 * @remarks
 * Contexts providers are executed in the order they were registered. Each provider gets access to context values
 * provided by any plugins that it depends on.
 *
 * @public
 */
export interface ContextContainer<TContext extends {}, TProviderParameters extends any[] = []> {
  /**
   * Register a new context provider. Throws an excpetion if more than one provider is registered for the same context
   * key.
   *
   * @param contextName - The key of the {@link TContext} object this provider supplies the value for.
   * @param provider - A {@link ContextProvider} to be called each time a new context is created.
   * @param plugin - The plugin this provider is associated with. If `undefined`, provider gets access to all provided
   *                 context keys.
   * @returns The `ContextContainer` for method chaining.
   */
  register<TContextName extends keyof TContext>(
    contextName: TContextName,
    provider: ContextProvider<TContext, TContextName, TProviderParameters>,
    plugin?: PluginName
  ): this;

  /**
   * Create a new context.
   *
   * @param plugin - The plugin the context will be exposed to.
   * @param baseContext - The initial context for the given handler.
   * @param contextArgs - Additional parameters to call providers with.
   * @returns A Promise for the new context object.
   */
  createContext(
    plugin: PluginName,
    baseContext: Partial<TContext>,
    ...contextArgs: TProviderParameters
  ): Promise<TContext>;
}

/** @internal */
export class ContextContainerImplementation<
  TContext extends {},
  TProviderParameters extends any[] = []
> implements ContextContainer<TContext, TProviderParameters> {
  /**
   * Used to map contexts to their providers and associated plugin. In registration order which is tightly coupled to
   * plugin load order.
   */
  private readonly contextProviders = new Map<
    keyof TContext,
    {
      provider: ContextProvider<TContext, keyof TContext, TProviderParameters>;
      plugin?: PluginName;
    }
  >();
  /** Used to keep track of which plugins registered which contexts for dependency resolution. */
  private readonly contextNamesByPlugin = new Map<PluginName, Array<keyof TContext>>();

  /**
   * @param pluginDependencies - A map of plugins to an array of their dependencies.
   */
  constructor(private readonly pluginDependencies: ReadonlyMap<PluginName, PluginName[]>) {}

  public register<TContextName extends keyof TContext>(
    contextName: TContextName,
    provider: ContextProvider<TContext, TContextName, TProviderParameters>,
    plugin?: PluginName
  ): this {
    if (this.contextProviders.has(contextName)) {
      throw new Error(`Context provider for ${contextName} has already been registered.`);
    }

    this.contextProviders.set(contextName, { provider, plugin });

    if (plugin) {
      this.contextNamesByPlugin.set(plugin, [
        ...(this.contextNamesByPlugin.get(plugin) || []),
        contextName,
      ]);
    }

    return this;
  }

  public async createContext(
    pluginName: PluginName,
    baseContext: Partial<TContext> = {},
    ...contextArgs: TProviderParameters
  ): Promise<TContext> {
    const contextNamesForPlugin = (plug: PluginName): Array<keyof TContext> => {
      const pluginDeps = this.pluginDependencies.get(plug)!;
      return flatten(pluginDeps.map(p => this.contextNamesByPlugin.get(p)!));
    };

    // Set of all contexts depended on by this plugin
    const neededContexts = new Set([
      ...(this.contextNamesByPlugin.get(pluginName) || []),
      ...contextNamesForPlugin(pluginName),
    ]);

    return [...this.contextProviders]
      .filter(
        ([contextName, { plugin }]) =>
          // Contexts we depend on OR provided by core
          neededContexts.has(contextName) || plugin === undefined
      )
      .reduce(
        async (contextPromise, [contextName, { provider, plugin }]) => {
          const resolvedContext = await contextPromise;

          // If the provider is not from a plugin, give access to the entire
          // context built so far (this is only possible for providers registered
          // by the service owner).
          const exposedContext = plugin
            ? pick(resolvedContext, contextNamesForPlugin(plugin))
            : resolvedContext;

          return {
            ...resolvedContext,
            [contextName]: await provider(exposedContext as Partial<TContext>, ...contextArgs),
          };
        },
        Promise.resolve(baseContext) as Promise<TContext>
      );
  }
}
