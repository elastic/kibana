/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { DeferredInitExampleStartContract } from '@kbn/deferred-init-example-plugin/server';
import { DATA_ROUTE } from '../common/constants';

export class DeferredInitExampleConsumerServerPlugin implements Plugin<object, object> {
  private readonly logger: Logger;
  // Set once `start()` has resolved `deferredInitExample`'s contract. Guards the fetch (and its
  // log line) from repeating if `start()` gets called again — see `start()` below for why that
  // can happen.
  private deferredInitExample?: DeferredInitExampleStartContract;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): object {
    this.logger.debug('deferredInitExampleConsumer: Setup');

    const router = core.http.createRouter();

    router.get(
      {
        path: DATA_ROUTE,
        security: {
          authz: {
            enabled: false,
            reason: 'Demo/dev route; exercises deferred-init third-trigger path.',
          },
        },
        validate: false,
      },
      async (_context, _request, response) => {
        // The third trigger path: this plugin never touches `deferredInitExample`'s own
        // routes, yet loading its start contract here still (1) kicks its deferred init if
        // nobody has triggered it yet, (2) waits for it, and (3) throws
        // DeferredInitializationError (-> 503 via core's central handler) on failure.
        const deferredInitExample =
          await core.plugins.loadPluginContract<DeferredInitExampleStartContract>(
            'deferredInitExample'
          );
        const doc = await deferredInitExample.getDoc();
        return response.ok({ body: doc });
      }
    );

    return {};
  }

  public async start(core: CoreStart): Promise<object> {
    this.logger.debug('deferredInitExampleConsumer: Started');

    // Same third trigger path as the route handler above, but called from this plugin's OWN
    // `start()` instead of a route handler — the pattern Fleet's real dependents use to resolve
    // `fleetSetupCompleted()`. If this rejects with
    // a *retriable* `DeferredInitializationError`, core retries this whole `start()` call with
    // backoff (`PluginsSystem.startPluginWithRetry`) — so everything in `start()` has to tolerate
    // running again from scratch. Guarding on `this.deferredInitExample` is what makes that safe
    // here: a retry that gets this far again won't re-fetch or re-log.
    if (!this.deferredInitExample) {
      this.deferredInitExample =
        await core.plugins.loadPluginContract<DeferredInitExampleStartContract>(
          'deferredInitExample'
        );
      this.logger.info(
        'deferredInitExampleConsumer: resolved deferredInitExample contract from start()'
      );
    }

    return {};
  }

  public stop(): void {}
}
