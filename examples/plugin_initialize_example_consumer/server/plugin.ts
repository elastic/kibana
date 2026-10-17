/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitialization,
  PluginInitializerContext,
  PluginInitStatus,
} from '@kbn/core/server';
import { toStatusBody } from '@kbn/plugin-initialize-example-plugin/common';
import type {
  PluginInitializeExampleDoc,
  PluginInitializeExampleStartContract,
} from '@kbn/plugin-initialize-example-plugin/server';
import {
  DEPENDENCY_ID,
  DOC_ROUTE,
  INITIALIZE_ROUTE,
  PLUGIN_ID,
  STATUS_ROUTE,
} from '../common/constants';

/** Start contracts core injects at boot, exactly as for any required dependency. */
export interface PluginInitializeExampleConsumerStartDeps {
  pluginInitializeExample: PluginInitializeExampleStartContract;
}

export interface PluginInitializeExampleConsumerStartContract {
  /** Delegates to the dependency's `getDoc()`, which waits for the dependency's own `initialize()`. */
  getDependencyDoc(): Promise<PluginInitializeExampleDoc>;
}

const describeStatus = ({ state, attempts, lastError }: PluginInitStatus): string =>
  `${state} (attempts: ${attempts}${lastError ? `, lastError: ${lastError.message}` : ''})`;

export class PluginInitializeExampleConsumerServerPlugin
  implements
    Plugin<
      object,
      PluginInitializeExampleConsumerStartContract,
      {},
      PluginInitializeExampleConsumerStartDeps
    >
{
  private readonly logger: Logger;
  private readonly initialization: PluginInitialization;
  private dependencyStatusSubscription?: Subscription;
  // The dependency's start contract, received at boot in start(core, plugins).
  private example?: PluginInitializeExampleStartContract;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    // This plugin has no initialize(), yet core tracks it: `available` once start() has returned.
    this.initialization = ctx.initialization;
  }

  public setup(core: CoreSetup<PluginInitializeExampleConsumerStartDeps>): object {
    // Nothing here is gated: only plugins with initialize() get a guarded router.
    const router = core.http.createRouter();

    // Status of a declared dependency. Replays the current value and never starts an attempt.
    this.dependencyStatusSubscription = core.plugins
      .pluginInitStatus$(DEPENDENCY_ID)
      .subscribe((status) => {
        this.logger.info(`${DEPENDENCY_ID} initialize() status: ${describeStatus(status)}`);
      });

    router.get(
      {
        path: DOC_ROUTE,
        security: {
          authz: {
            enabled: false,
            reason: "Example route; serves the dependency's demo document.",
          },
        },
        validate: false,
      },
      // The dependency's getDoc() awaits the dependency's own initialize(), starting an attempt
      // right away if needed. When that attempt fails, the PluginInitializationError it rejects
      // with escapes this handler and core's router answers 503 with Retry-After.
      async (_context, _request, response) =>
        response.ok({ body: await this.getDependency().getDoc() })
    );

    router.get(
      {
        path: STATUS_ROUTE,
        security: {
          authz: { enabled: false, reason: 'Example route; serves non-sensitive init status.' },
        },
        validate: false,
      },
      (_context, _request, response) =>
        response.ok({
          body: {
            self: toStatusBody(this.initialization.getStatus()),
            dependency: toStatusBody(core.plugins.getPluginInitStatus(DEPENDENCY_ID)),
          },
        })
    );

    router.post(
      {
        path: INITIALIZE_ROUTE,
        security: {
          authz: { enabled: false, reason: 'Example route; waits for a dependency to initialize.' },
        },
        validate: false,
      },
      async (_context, _request, response) => {
        // Waits on this plugin's behalf: joins an attempt in flight, waits out a scheduled retry
        // instead of forcing one, and rejects (503) if the attempt it observes fails.
        await core.plugins.initializePlugin(DEPENDENCY_ID);
        return response.ok({
          body: toStatusBody(core.plugins.getPluginInitStatus(DEPENDENCY_ID)),
        });
      }
    );

    return {};
  }

  public start(
    _core: CoreStart,
    plugins: PluginInitializeExampleConsumerStartDeps
  ): PluginInitializeExampleConsumerStartContract {
    // Injected at boot like any required dependency; receiving it waits for nothing.
    const { pluginInitializeExample } = plugins;
    this.example = pluginInitializeExample;
    return { getDependencyDoc: () => pluginInitializeExample.getDoc() };
  }

  public stop(): void {
    this.dependencyStatusSubscription?.unsubscribe();
  }

  private getDependency(): PluginInitializeExampleStartContract {
    const { example } = this;
    if (!example) {
      // Unreachable in practice: core starts the HTTP server only after every plugin's start().
      throw new Error(`${PLUGIN_ID}: start() has not run yet`);
    }
    return example;
  }
}
