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
import {
  INDEX_NAME,
  DATA_ROUTE,
  INSTANCE_STATE_ROUTE,
  DOC_ID,
  MIGRATIONS_DELAY_MS,
} from '../common/constants';
import type { DeferredInitExampleConfig } from './config';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface DeferredInitExampleDoc {
  message: string;
  greeting: string;
  initializedAt: string;
  /**
   * UUID of the instance whose `lazyInitialize` last wrote this document. The document is
   * cluster-side, so it is shared by the whole deployment and every instance rewrites it — this
   * field is what makes "each instance runs the work" visible in the data itself.
   */
  initializedBy: string;
}

/**
 * State `lazyInitialize` warms in the memory of the instance it runs on: nothing persists it, and
 * a peer instance's run does not populate it here.
 *
 * Keeping instance-local state like this is only sound because deferred init is per instance:
 * core runs `lazyInitialize` exactly once on every instance, so anything that can legitimately
 * read this state (this plugin's gated routes, or a consumer holding the start contract handed
 * out by `loadPluginContract`) is downstream of this instance's own successful run. Under the
 * previous design — a distributed lock plus a shared saved object recording the outcome — an
 * instance could adopt `available` from a run that happened elsewhere and never execute
 * `lazyInitialize` itself, which made any in-memory field like this unsafe to read.
 */
export interface DeferredInitExampleInstanceState {
  /** UUID of the instance that produced this state, i.e. the one serving the request. */
  instanceUuid: string;
  initializedAt: string;
  /** Deferred phases this instance ran, in completion order. */
  completedPhases: readonly string[];
}

/**
 * `deferredInitExample`'s start contract. Consumed in-process by other plugins via
 * `core.plugins.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample')` (or
 * `context.loadPluginContract` in a route handler), which waits for this plugin's deferred init
 * before returning it — see the `deferred_init_example_consumer` demo plugin.
 *
 * Core never injects this contract into a dependent's `setup()`/`start()` arguments: a
 * deferred-init plugin may not be declared under `requiredPlugins`/`optionalPlugins` at all, so
 * `loadPluginContract` is the only way in.
 */
export interface DeferredInitExampleStartContract {
  /** Reads the cluster-side document written by whichever instance last ran `lazyInitialize`. */
  getDoc(): Promise<DeferredInitExampleDoc>;
  /**
   * Reads the calling instance's own in-memory deferred-init state. Synchronous, with no
   * readiness check or polling at the call site, because a caller can only hold this contract
   * after this instance's `lazyInitialize` succeeded.
   */
  getInstanceState(): DeferredInitExampleInstanceState;
}

export class DeferredInitExampleServerPlugin
  implements Plugin<object, DeferredInitExampleStartContract>
{
  private readonly logger: Logger;
  private readonly config: DeferredInitExampleConfig;
  private readonly instanceUuid: string;
  // `LazyInitContext` has no `core`/`plugins` field, so this is captured here, during `start()`,
  // purely so `lazyInitialize` below can reach `core.plugins.loadPluginContract` later. Guaranteed
  // set by the time `lazyInitialize` can ever run: core only attaches the deferred-init runner
  // for this plugin right after `start()` itself resolves.
  private core?: CoreStart;
  // Populated by `lazyInitialize`, read by the routes and the start contract. See
  // `DeferredInitExampleInstanceState` for why a plain instance field is now the right place for
  // deferred-init output.
  private instanceState?: DeferredInitExampleInstanceState;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<DeferredInitExampleConfig>();
    this.instanceUuid = initializerContext.env.instanceUuid;
  }

  public async lazyInitialize(ctx: LazyInitContext): Promise<void> {
    const { logger, elasticsearch } = ctx;
    logger.info(
      '[deferredInitExample] lazyInitialize: running deferred Elasticsearch initialization'
    );

    const completedPhases: string[] = [];

    // Phase 1: stand-in for slow saved-object migrations (fake await, no real migration).
    logger.info('[deferredInitExample] step: running saved object migrations');
    await delay(MIGRATIONS_DELAY_MS);
    completedPhases.push('savedObjectMigrations');

    if (this.config.forceFailure) {
      throw new Error('[deferredInitExample] forced failure (config forceFailure=true)');
    }

    // Phase 2: stand-in for additional per-project default-state initialization.
    logger.info('[deferredInitExample] step: initializing default state');
    await delay(this.config.initDelayMs);
    completedPhases.push('defaultState');

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
    completedPhases.push('loadedDependencyContract');

    // Phase 4: real direct ES write (create index + mapping, write the default document).
    logger.info('[deferredInitExample] step: creating index and writing default document');
    const { client } = elasticsearch;

    // `lazyInitialize` runs once per Kibana instance, so several instances can reach this point
    // concurrently against the same cluster: tolerate a peer having created the index between the
    // check and the create, rather than failing the whole run on the loser of that race.
    try {
      await client.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            message: { type: 'text' },
            greeting: { type: 'text' },
            initializedAt: { type: 'date' },
            initializedBy: { type: 'keyword' },
          },
        },
      });
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        throw error;
      }
      logger.debug('[deferredInitExample] index already exists; continuing');
    }

    const initializedAt = new Date().toISOString();
    // Idempotent by construction: a fixed document id, so a peer instance running this same
    // phase concurrently overwrites rather than duplicates.
    await client.index({
      index: INDEX_NAME,
      id: DOC_ID,
      document: {
        message: 'Initialized by deferred lazyInitialize',
        greeting,
        initializedAt,
        initializedBy: this.instanceUuid,
      },
      refresh: true,
    });
    completedPhases.push('wroteDefaultDocument');

    // Phase 5: publish the instance-local state. Assigned once, at the end, so a run that throws
    // earlier leaves nothing half-warmed behind — core re-runs this whole method on this instance
    // when it retries, rather than resuming it.
    this.instanceState = {
      instanceUuid: this.instanceUuid,
      initializedAt,
      completedPhases,
    };

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

    router.get(
      {
        path: INSTANCE_STATE_ROUTE,
        security: {
          authz: {
            enabled: false,
            reason: 'Demo/dev route; exercises deferred-init.',
          },
        },
        validate: false,
      },
      // Reads memory this plugin's own `lazyInitialize` warmed, with no readiness check: core
      // gates every route of a lazy plugin behind its deferred init, so this handler cannot run
      // before `lazyInitialize` succeeded on this instance.
      (_context, _request, response) => response.ok({ body: this.getInstanceState() })
    );

    return {};
  }

  public start(core: CoreStart): DeferredInitExampleStartContract {
    this.logger.debug('deferredInitExample: Started');
    this.core = core;
    return {
      getDoc: async () => this.getDocFrom(core.elasticsearch.client.asInternalUser),
      getInstanceState: () => this.getInstanceState(),
    };
  }

  private async getDocFrom(client: ElasticsearchClient): Promise<DeferredInitExampleDoc> {
    const result = await client.get<DeferredInitExampleDoc>({
      index: INDEX_NAME,
      id: DOC_ID,
    });
    return result._source!;
  }

  /**
   * Asserts rather than reports readiness: every legitimate caller (a gated route of this plugin,
   * or a consumer that obtained the start contract from `loadPluginContract`) is downstream of a
   * successful `lazyInitialize` on this instance, so an unset field here is a core-level bug, not
   * a state a consumer is expected to poll through.
   */
  private getInstanceState(): DeferredInitExampleInstanceState {
    if (!this.instanceState) {
      throw new Error(
        '[deferredInitExample] instance state is not warmed: lazyInitialize has not completed on this instance'
      );
    }
    return this.instanceState;
  }

  public stop(): void {}
}
