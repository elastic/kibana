/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flatten } from 'lodash';
import { ShallowPromise } from '@kbn/utility-types';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreId } from '@kbn/core-base-common-internal';
import type {
  RequestHandler,
  RequestHandlerContextBase,
  IContextProvider,
  IContextContainer,
  HandlerParameters,
  HandlerContextType,
} from '@kbn/core-http-server';

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
    Context extends RequestHandlerContextBase,
    ContextName extends keyof Context
  >(
    source: symbol,
    name: ContextName,
    provider: IContextProvider<Context, ContextName>
  ): this => {
    const contextName = name as string;
    if (contextName === 'resolve') {
      throw new Error(`Cannot register a provider for ${contextName}, it is a reserved keyword.`);
    }
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
      const context = this.buildContext(source, ...args);
      return handler(context, ...args);
    }) as (
      ...args: HandlerParameters<RequestHandler>
    ) => ShallowPromise<ReturnType<RequestHandler>>;
  };

  private buildContext(
    source: symbol,
    ...contextArgs: HandlerParameters<RequestHandler>
  ): HandlerContextType<RequestHandler> {
    const contextsToBuild = new Set(this.getContextNamesForSource(source));
    const builtContextPromises: Record<string, Promise<unknown>> = {};

    const builtContext = {} as HandlerContextType<RequestHandler>;
    (builtContext as unknown as RequestHandlerContextBase).resolve = async (keys) => {
      const resolved = await Promise.all(
        keys.map(async (key) => {
          return [key, await builtContext[key]];
        })
      );
      return Object.fromEntries(resolved);
    };

    return [...this.contextProviders]
      .sort(sortByCoreFirst(this.coreId))
      .filter(([contextName]) => contextsToBuild.has(contextName))
      .reduce((contextAccessors, [contextName, { provider, source: providerSource }]) => {
        const exposedContext = createExposedContext({
          currentContextName: contextName,
          exposedContextNames: [...this.getContextNamesForSource(providerSource)],
          contextAccessors,
        });
        Object.defineProperty(contextAccessors, contextName, {
          get: async () => {
            const contextKey = contextName as keyof HandlerContextType<RequestHandler>;
            if (!builtContextPromises[contextKey]) {
              builtContextPromises[contextKey] = provider(exposedContext, ...contextArgs);
            }
            return await builtContextPromises[contextKey];
          },
        });

        return contextAccessors;
      }, builtContext);
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

const createExposedContext = ({
  currentContextName,
  exposedContextNames,
  contextAccessors,
}: {
  currentContextName: string;
  exposedContextNames: string[];
  contextAccessors: Partial<HandlerContextType<RequestHandler>>;
}) => {
  const exposedContext: Partial<HandlerContextType<RequestHandler>> = {};
  exposedContext.resolve = contextAccessors.resolve;

  for (const contextName of exposedContextNames) {
    if (contextName === currentContextName) {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(contextAccessors, contextName);
    if (descriptor) {
      Object.defineProperty(exposedContext, contextName, descriptor);
    }
  }

  return exposedContext;
};
