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

/**
 * Start contract of the consumer. Demonstrates the "function-in-contract" pattern: `start()`
 * returns a function that loads a lazy dependency's contract, rather than loading it during
 * `start()` itself.
 */
export interface DeferredInitExampleConsumerStartContract {
  /**
   * Resolves `deferredInitExample`'s start contract, triggering (and waiting for) its deferred
   * init on the way.
   *
   * MUST be called post-boot (from a route handler, task runner, etc.). Core's start-cycle guard
   * rejects `loadPluginContract` for a lazy plugin during the `start()` lifecycle, so another
   * plugin must NOT call this from inside its own `start()`.
   */
  getDeferredInitExample: () => Promise<DeferredInitExampleStartContract>;
}

export class DeferredInitExampleConsumerServerPlugin
  implements Plugin<object, DeferredInitExampleConsumerStartContract>
{
  private readonly logger: Logger;

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
        // Correct pattern #1 — call `loadPluginContract` from a route handler (post-boot). This
        // plugin never touches `deferredInitExample`'s own routes, yet loading its start contract
        // here still (1) kicks its deferred init if nobody has triggered it yet, (2) waits for it,
        // and (3) throws DeferredInitializationError (-> 503 via core's central handler) on failure.
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

  public start(core: CoreStart): DeferredInitExampleConsumerStartContract {
    this.logger.debug('deferredInitExampleConsumer: Started');

    // Correct pattern #2 — the "function-in-contract" pattern Fleet's real dependents use to
    // resolve things like `fleetSetupCompleted()`. `start()` returns a function that loads the
    // lazy dependency; it is only ever invoked post-boot by whoever consumes this contract.
    // Doing the `loadPluginContract` call *here in `start()`* instead would be rejected by core's
    // start-cycle guard, because awaiting a lazy plugin's deferred init blocks boot.
    return {
      getDeferredInitExample: () =>
        core.plugins.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample'),
    };
  }

  public stop(): void {}
}
