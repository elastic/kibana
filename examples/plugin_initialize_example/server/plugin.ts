/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Plugin,
  PluginInitialization,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { PluginInitializeExampleConfig } from './config';

export const INDEX_NAME = '.kibana_plugin_initialize_example';
export const DOC_ID = 'initialized';
export const DOC_ROUTE = '/internal/plugin_initialize_example/doc';

/** The document `initialize()` writes. */
export interface PluginInitializeExampleDoc {
  /** The Kibana instance whose `initialize()` wrote it last. */
  instanceUuid: string;
  initializedAt: string;
}

/** Returned by `start()` at boot, without waiting for `initialize()`. */
export interface PluginInitializeExampleStartContract {
  /** Waits for this plugin's `initialize()`, then reads the document it wrote. */
  getDoc(): Promise<PluginInitializeExampleDoc>;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isIndexAlreadyExists = (error: unknown): boolean =>
  error instanceof errors.ResponseError &&
  error.body?.error?.type === 'resource_already_exists_exception';

export class PluginInitializeExampleServerPlugin
  implements Plugin<void, PluginInitializeExampleStartContract>
{
  private readonly config: PluginInitializeExampleConfig;
  private readonly instanceUuid: string;
  private readonly initialization: PluginInitialization;
  private client?: ElasticsearchClient;

  constructor(ctx: PluginInitializerContext<PluginInitializeExampleConfig>) {
    this.config = ctx.config.get();
    this.instanceUuid = ctx.env.instanceUuid;
    // Kept on the instance: route handlers and contract functions read it after boot.
    this.initialization = ctx.initialization;
  }

  public setup(core: CoreSetup): void {
    const router = core.http.createRouter();

    // Needs the initialized state, so it waits for initialize() before answering.
    router.get(
      {
        path: DOC_ROUTE,
        security: { authz: { enabled: false, reason: 'Example route; serves a demo document.' } },
        validate: false,
      },
      async (_context, _request, response) => response.ok({ body: await this.getDoc() })
    );
  }

  /**
   * Core calls it once with start()'s arguments, after every plugin has started, and does not
   * wait for it. Core logs a throw and leaves it unhandled: production Kibana logs a warning and
   * keeps running, dev Kibana exits.
   */
  public async initialize(core: CoreStart): Promise<void> {
    const { failInitialize, initDelayMs } = this.config;
    await delay(initDelayMs);
    if (failInitialize) {
      throw new Error('Simulated initialize() failure');
    }

    const client = core.elasticsearch.client.asInternalUser;
    // Every Kibana instance runs initialize() against the same cluster, so another instance may
    // have created the index first. That error is recoverable, so it is caught here.
    await client.indices
      .create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            instanceUuid: { type: 'keyword' },
            initializedAt: { type: 'date' },
          },
        },
      })
      .catch((error: unknown) => {
        if (!isIndexAlreadyExists(error)) {
          throw error;
        }
      });

    const doc: PluginInitializeExampleDoc = {
      instanceUuid: this.instanceUuid,
      initializedAt: new Date().toISOString(),
    };
    // A fixed id keeps the write idempotent: concurrent instances overwrite, never duplicate.
    await client.index({ index: INDEX_NAME, id: DOC_ID, document: doc, refresh: true });
  }

  public start(core: CoreStart): PluginInitializeExampleStartContract {
    this.client = core.elasticsearch.client.asInternalUser;
    return {
      getDoc: () => this.getDoc(),
    };
  }

  private async getDoc(): Promise<PluginInitializeExampleDoc> {
    await this.initialization.initialize();
    const { _source } = await this.getClient().get<PluginInitializeExampleDoc>({
      index: INDEX_NAME,
      id: DOC_ID,
    });
    if (!_source) {
      throw new Error(`Document "${DOC_ID}" in "${INDEX_NAME}" has no source`);
    }
    return _source;
  }

  private getClient(): ElasticsearchClient {
    const { client } = this;
    if (!client) {
      // Unreachable in practice: initialize() resolves only after every plugin's start().
      throw new Error('pluginInitializeExample: start() has not run yet');
    }
    return client;
  }
}
