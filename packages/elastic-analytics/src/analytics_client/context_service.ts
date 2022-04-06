/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Subject, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { EventContext } from '../events';
import type { ContextProviderName, ContextProviderOpts } from './types';

export class ContextService {
  private readonly contextProvidersRegistry = new Map<ContextProviderName, Partial<EventContext>>();
  private readonly contextProvidersSubscriptions = new Map<ContextProviderName, Subscription>();

  constructor(
    private readonly context$: Subject<Partial<EventContext>>,
    private readonly isDevMode: boolean
  ) {}

  /**
   * Registers a context provider, and subscribes to any updates from it.
   * @param contextProviderOpts The options to register the context provider {@link ContextProviderOpts}
   */
  public registerContextProvider<Context>({ name, context$ }: ContextProviderOpts<Context>) {
    if (this.contextProvidersSubscriptions.has(name)) {
      throw new Error(`Context provider with name '${name}' already registered`);
    }

    const subscription = context$
      .pipe(
        tap((ctx) => {
          if (this.isDevMode) {
            // TODO: In the future we may need to validate the input of the context based on the schema (only if isDev)
          }
        })
      )
      .subscribe((context) => {
        // We store each context linked to the context provider so they can increase and reduce
        // the number of fields they report without having left-overs in the global context.
        this.contextProvidersRegistry.set(name, context);

        // For every context change, we rebuild the global context.
        // It's better to do it here than to rebuild it for every reportEvent.
        this.updateGlobalContext();
      });

    this.contextProvidersSubscriptions.set(name, subscription);
  }

  /**
   * Removes the context provider from the registry, unsubscribes from it, and rebuilds the global context.
   * @param name The name of the context provider to remove.
   */
  public removeContextProvider(name: ContextProviderName) {
    this.contextProvidersSubscriptions.get(name)?.unsubscribe();
    this.contextProvidersRegistry.delete(name);
    this.updateGlobalContext();
  }

  /**
   * Loops through all the context providers and sets the global context
   * @private
   */
  private updateGlobalContext() {
    this.context$.next(
      [...this.contextProvidersRegistry.values()].reduce((acc, context) => {
        return {
          ...acc,
          ...context,
        };
      }, {} as Partial<EventContext>)
    );
  }
}
