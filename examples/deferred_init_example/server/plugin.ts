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
  LazyInitContext,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { DeferredInitExampleDependencyStartContract } from '@kbn/deferred-init-example-dependency-plugin/server';
import { INDEX_NAME, DATA_ROUTE, DOC_ID, MIGRATIONS_DELAY_MS } from '../common/constants';
import type { DeferredInitExampleConfig } from './config';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface DeferredInitExampleDoc {
  message: string;
  greeting: string;
  initializedAt: string;
}

/**
 * `deferredInitExample`'s start contract. Consumed in-process by other plugins via
 * `core.plugins.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample')`,
 * which waits for this plugin's deferred init before returning it — see the
 * `deferred_init_example_consumer` demo plugin.
 */
export interface DeferredInitExampleStartContract {
  getDoc(): Promise<DeferredInitExampleDoc>;
}

export class DeferredInitExampleServerPlugin
  implements Plugin<object, DeferredInitExampleStartContract>
{
  private readonly logger: Logger;
  private readonly config: DeferredInitExampleConfig;
  // `LazyInitContext` has no `core`/`plugins` field, so this is captured here, during `start()`,
  // purely so `lazyInitialize` below can reach `core.plugins.loadPluginContract` later. Guaranteed
  // set by the time `lazyInitialize` can ever run: core only attaches the deferred-init runner
  // for this plugin right after `start()` itself resolves.
  private core?: CoreStart;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<DeferredInitExampleConfig>();
  }

  public async lazyInitialize(ctx: LazyInitContext): Promise<void> {
    const { logger, elasticsearch } = ctx;
    logger.info(
      '[deferredInitExample] lazyInitialize: running deferred Elasticsearch initialization'
    );

    // Phase 1: stand-in for slow saved-object migrations (fake await, no real migration).
    logger.info('[deferredInitExample] step: running saved object migrations');
    await delay(MIGRATIONS_DELAY_MS);

    if (this.config.forceFailure) {
      throw new Error('[deferredInitExample] forced failure (config forceFailure=true)');
    }

    // Phase 2: stand-in for additional per-project default-state initialization.
    logger.info('[deferredInitExample] step: initializing default state');
    await delay(this.config.initDelayMs);

    // Phase 3: cross-plugin trigger path — load `deferredInitExampleDependency`'s start contract
    // in-process. This is the same `loadPluginContract` `deferred_init_example_consumer` calls
    // from a route handler, but called here from inside `lazyInitialize` itself via the `core`
    // captured on `this` in `start()` below.
    logger.info('[deferredInitExample] step: loading deferredInitExampleDependency start contract');
    const dependency =
      await this.core!.plugins.loadPluginContract<DeferredInitExampleDependencyStartContract>(
        'deferredInitExampleDependency'
      );
    const greeting = dependency.getGreeting();

    // Phase 4: real direct ES write (create index + mapping, write the default document).
    logger.info('[deferredInitExample] step: creating index and writing default document');
    const { client } = elasticsearch;

    const indexExists = await client.indices.exists({ index: INDEX_NAME });
    if (!indexExists) {
      await client.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            message: { type: 'text' },
            greeting: { type: 'text' },
            initializedAt: { type: 'date' },
          },
        },
      });
    }

    await client.index({
      index: INDEX_NAME,
      id: DOC_ID,
      document: {
        message: 'Initialized by deferred lazyInitialize',
        greeting,
        initializedAt: new Date().toISOString(),
      },
      refresh: true,
    });

    logger.info('[deferredInitExample] lazyInitialize: deferred initialization complete');
  }

  public setup(core: CoreSetup): object {
    this.logger.debug('deferredInitExample: Setup');

    const router = core.http.createRouter();

    router.get(
      {
        path: DATA_ROUTE,
        security: {
          authz: {
            enabled: false,
            reason: 'Demo/dev route; exercises deferred-init.',
          },
        },
        validate: false,
      },
      async (context, _request, response) => {
        const { elasticsearch } = await context.core;
        const doc = await this.getDocFrom(elasticsearch.client.asInternalUser);
        return response.ok({ body: doc });
      }
    );

    return {};
  }

  public start(core: CoreStart): DeferredInitExampleStartContract {
    this.logger.debug('deferredInitExample: Started');
    this.core = core;
    return {
      getDoc: async () => this.getDocFrom(core.elasticsearch.client.asInternalUser),
    };
  }

  private async getDocFrom(client: ElasticsearchClient): Promise<DeferredInitExampleDoc> {
    const result = await client.get<DeferredInitExampleDoc>({
      index: INDEX_NAME,
      id: DOC_ID,
    });
    return result._source!;
  }

  public stop(): void {}
}
