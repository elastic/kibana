/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ContextProvider<TParams, TContext> {
  order: number;
  resolve: (params: TParams) => TContext | undefined;
}

export abstract class ContextService<TParams, TContext> {
  private providers: Array<ContextProvider<TParams, TContext>> = [];

  public registerProvider(provider: ContextProvider<TParams, TContext>) {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.order - b.order);
  }

  public resolve(params: TParams): TContext {
    for (const provider of this.providers) {
      const context = provider.resolve(params);

      if (context) {
        return context;
      }
    }

    return this.getDefaultContext();
  }

  protected abstract getDefaultContext(): TContext;
}
