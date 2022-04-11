/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flatten } from 'lodash';
import { ShallowPromise, MaybePromise } from '@kbn/utility-types';
import { pick } from 'lodash';
import type { CoreId, PluginOpaqueId, RequestHandler, RequestHandlerContext } from '../..';

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
  Context extends RequestHandlerContext,
  ContextName extends keyof Context
> = (
  // context.core will always be available, but plugin contexts are typed as optional
  context: Omit<Context, ContextName>,
  ...rest: HandlerParameters<RequestHandler>
) => MaybePromise<Awaited<Context[ContextName]>>;

/**
 * A function that accepts a context object and an optional number of additional arguments. Used for the generic types
 * in {@link IContextContainer}
 *
 * @public
 */
export type HandlerFunction<T extends object> = (context: T, ...args: any[]) => any;

/**
 * Extracts the type of the first argument of a {@link HandlerFunction} to represent the type of the context.
 *
 * @public
 */
export type HandlerContextType<T extends HandlerFunction<any>> = T extends HandlerFunction<infer U>
  ? U
  : never;

/**
 * Extracts the types of the additional arguments of a {@link HandlerFunction}, excluding the
 * {@link HandlerContextType}.
 *
 * @public
 */
export type HandlerParameters<T extends HandlerFunction<any>> = T extends (
  context: any,
  ...args: infer U
) => any
  ? U
  : never;

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
export interface IContextContainer {
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
  registerContext<Context extends RequestHandlerContext, ContextName extends keyof Context>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: ContextName,
    provider: IContextProvider<Context, ContextName>
  ): this;

  /**
   * Create a new handler function pre-wired to context for the plugin.
   *
   * @param pluginOpaqueId - The plugin opaque ID for the plugin that registers this handler.
   * @param handler - Handler function to pass context object to.
   * @returns A function that takes `RequestHandler` parameters, calls `handler` with a new context, and returns a Promise of
   * the `handler` return value.
   */
  createHandler(
    pluginOpaqueId: PluginOpaqueId,
    handler: RequestHandler
  ): (...rest: HandlerParameters<RequestHandler>) => ShallowPromise<ReturnType<RequestHandler>>;
}

/** @internal */
export class ContextContainer implements IContextContainer {
  /**
   * Used to map contexts to their providers and associated plugin. In registration order which is tightly coupled to
   * plugin load order.
   */
  private readonly contextProviders = new Map<
    string,
    {
      provider: IContextProvider<any, any>;
      source: symbol;
    }
  >();
  /** Used to keep track of which plugins registered which contexts for dependency resolution. */
  private readonly contextNamesBySource: Map<symbol, string[]>;

  /**
   * @param pluginDependencies - A map of plugins to an array of their dependencies.
   */
  constructor(
    private readonly pluginDependencies: ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]>,
    private readonly coreId: CoreId
  ) {
    this.contextNamesBySource = new Map<symbol, string[]>([[coreId, []]]);
  }

  public registerContext = <
    Context extends RequestHandlerContext,
    ContextName extends keyof Context
  >(
    source: symbol,
    name: ContextName,
    provider: IContextProvider<Context, ContextName>
  ): this => {
    const contextName = name as string;
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

  public createHandler = (source: symbol, handler: RequestHandler) => {
    if (source !== this.coreId && !this.pluginDependencies.has(source)) {
      throw new Error(`Cannot create handler for unknown plugin: ${source.toString()}`);
    }

    return (async (...args: HandlerParameters<RequestHandler>) => {
      const context = await this.buildContext(source, ...args);
      return handler(context, ...args);
    }) as (
      ...args: HandlerParameters<RequestHandler>
    ) => ShallowPromise<ReturnType<RequestHandler>>;
  };

  private async buildContext(
    source: symbol,
    ...contextArgs: HandlerParameters<RequestHandler>
  ): Promise<HandlerContextType<RequestHandler>> {
    const contextsToBuild = new Set(this.getContextNamesForSource(source));

    const builtContextes: Partial<HandlerContextType<RequestHandler>> = {};

    return [...this.contextProviders]
      .sort(sortByCoreFirst(this.coreId))
      .filter(([contextName]) => contextsToBuild.has(contextName))
      .reduce((alreadyBuildContextParts, [contextName, { provider, source: providerSource }]) => {
        // For the next provider, only expose the context available based on the dependencies of the plugin that
        // registered that provider.
        const exposedContext = pick(alreadyBuildContextParts, [
          ...this.getContextNamesForSource(providerSource),
        ]);

        Object.defineProperty(alreadyBuildContextParts, contextName, {
          get: async () => {
            const contextKey = contextName as keyof HandlerContextType<RequestHandler>;
            if (!builtContextes[contextKey]) {
              builtContextes[contextKey] = await provider(exposedContext, ...contextArgs);
            }
            return builtContextes[contextKey]!;
          },
        });

        return alreadyBuildContextParts;
      }, {} as HandlerContextType<RequestHandler>);
  }

  private getContextNamesForSource(source: symbol): ReadonlySet<string> {
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
      ...flatten(pluginDeps.map((p) => this.contextNamesBySource.get(p) || [])),
    ]);
  }
}

/** Sorts context provider pairs by core pairs first. */
const sortByCoreFirst =
  (
    coreId: symbol
  ): ((left: [any, { source: symbol }], right: [any, { source: symbol }]) => number) =>
  ([leftName, leftProvider], [rightName, rightProvider]) => {
    if (leftProvider.source === coreId) {
      return rightProvider.source === coreId ? 0 : -1;
    } else {
      return rightProvider.source === coreId ? 1 : 0;
    }
  };
