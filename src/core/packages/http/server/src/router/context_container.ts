/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { ShallowPromise } from '@kbn/utility-types';
import type { HandlerParameters, IContextProvider } from './context_provider';
import type { RequestHandler } from './request_handler';
import type { RequestHandlerContextBase } from './request_handler_context';

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
  registerContext<Context extends RequestHandlerContextBase, ContextName extends keyof Context>(
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
