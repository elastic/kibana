/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { escape } from 'lodash';
import { interval, type Subscription } from 'rxjs';
import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Logger,
  Plugin,
  PluginInitialization,
  PluginInitializerContext,
  PluginInitStatus,
} from '@kbn/core/server';
import type { MaybePromise } from '@kbn/utility-types';
import {
  DOC_ID,
  DOC_ROUTE,
  HEALTH_PATH,
  INDEX_NAME,
  PLUGIN_ID,
  STATUS_ROUTE,
  toStatusBody,
} from '../common';
import type { PluginInitializeExampleDoc } from '../common';
import type { PluginInitializeExampleConfig } from './config';

const HEARTBEAT_INTERVAL_MS = 60_000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isIndexAlreadyExists = (error: unknown): boolean =>
  error instanceof errors.ResponseError &&
  error.body?.error?.type === 'resource_already_exists_exception';

const describeStatus = ({ state, attempts, lastError }: PluginInitStatus): string =>
  `${state} (attempts: ${attempts}${lastError ? `, lastError: ${lastError.message}` : ''})`;

/** What this instance's own `initialize()` left in memory; `undefined` until it has succeeded here. */
export interface PluginInitializeExampleInstanceState {
  initializedAt: string;
  /** The attempt that succeeded on this instance, counting from 1. */
  attempt: number;
}

/** The instance answering, where its `initialize()` stands, and what that `initialize()` produced. */
export interface PluginInitializeExampleInstanceInfo {
  instanceUuid: string;
  status: PluginInitStatus;
  instanceState?: PluginInitializeExampleInstanceState;
}

/**
 * Start contract, returned at boot like any plugin's. `getDoc()` waits for this plugin's own
 * `initialize()`; `getInstanceInfo()` never waits for anything.
 */
export interface PluginInitializeExampleStartContract {
  /** Reads the document `initialize()` wrote, once `initialize()` has succeeded on this instance. */
  getDoc(): Promise<PluginInitializeExampleDoc>;
  /** Synchronous and never triggers an `initialize()` attempt. */
  getInstanceInfo(): PluginInitializeExampleInstanceInfo;
}

export class PluginInitializeExampleServerPlugin
  implements Plugin<object, MaybePromise<PluginInitializeExampleStartContract>>
{
  private readonly logger: Logger;
  private readonly config: PluginInitializeExampleConfig;
  private readonly instanceUuid: string;
  private readonly initialization: PluginInitialization;
  private readonly statusSubscription: Subscription;
  private client?: ElasticsearchClient;
  private attempts = 0;
  private instanceState?: PluginInitializeExampleInstanceState;
  private heartbeat?: Subscription;

  constructor(ctx: PluginInitializerContext<PluginInitializeExampleConfig>) {
    this.logger = ctx.logger.get();
    this.config = ctx.config.get();
    this.instanceUuid = ctx.env.instanceUuid;
    // Kept on the instance: the contract functions and the heartbeat read it after boot.
    this.initialization = ctx.initialization;
    // Replays the current status and never starts an attempt; one log line per transition.
    this.statusSubscription = this.initialization.status$.subscribe((status) => {
      this.logger.info(`initialize() status: ${describeStatus(status)}`);
    });
  }

  public setup(core: CoreSetup): object {
    // Core gates every route of this router: 503 + Retry-After until initialize() has succeeded
    // on this instance, and the first such request starts initialize() if nothing else has.
    const router = core.http.createRouter();

    router.get(
      {
        path: DOC_ROUTE,
        security: { authz: { enabled: false, reason: 'Example route; serves a demo document.' } },
        validate: false,
      },
      async (_context, _request, response) => response.ok({ body: await this.getDoc() })
    );

    router.get(
      {
        path: STATUS_ROUTE,
        security: {
          authz: { enabled: false, reason: "Example route; serves the plugin's own init status." },
        },
        validate: false,
      },
      (_context, _request, response) =>
        response.ok({ body: toStatusBody(this.initialization.getStatus()) })
    );

    // Core does not gate httpResources: this page answers while initialize() is still running or
    // has failed, which is what makes it usable as a health view.
    core.http.resources.register(
      {
        path: HEALTH_PATH,
        security: {
          authz: { enabled: false, reason: "Example page; shows the plugin's own init status." },
        },
        validate: false,
      },
      (_context, _request, response) => response.renderHtml({ body: this.renderHealthPage() })
    );

    return {};
  }

  /**
   * Called by core with start()'s arguments once every plugin has started: at boot by default
   * (`plugins.initializeOnBoot: true`), otherwise on the first request, app load or call that
   * needs this plugin. A throw never fails boot: core retries with backoff and reports `failed`.
   */
  public async initialize(core: CoreStart): Promise<void> {
    this.attempts += 1;
    const attempt = this.attempts;
    const { failAttempts, initDelayMs } = this.config;
    if (attempt <= failAttempts) {
      throw new Error(`Simulated initialize() failure ${attempt} of ${failAttempts}`);
    }

    await delay(initDelayMs);

    const client = core.elasticsearch.client.asInternalUser;
    // Every Kibana instance runs initialize() on its own against the same cluster, so a peer may
    // have created the index between this instance's boot and this call: not an error here.
    try {
      await client.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            instanceUuid: { type: 'keyword' },
            initializedAt: { type: 'date' },
            attempt: { type: 'integer' },
          },
        },
      });
    } catch (error) {
      if (!isIndexAlreadyExists(error)) {
        throw error;
      }
    }

    const initializedAt = new Date().toISOString();
    const doc: PluginInitializeExampleDoc = {
      instanceUuid: this.instanceUuid,
      initializedAt,
      attempt,
    };
    // A fixed id keeps the write idempotent: concurrent instances overwrite, never duplicate.
    await client.index({ index: INDEX_NAME, id: DOC_ID, document: doc, refresh: true });

    this.instanceState = { initializedAt, attempt };
  }

  /**
   * Runs at boot and returns the contract without waiting for initialize(). Only the
   * `slowStartMs` demo knob turns the return value into a promise; a real start() hands the
   * contract back directly.
   */
  public start(core: CoreStart): MaybePromise<PluginInitializeExampleStartContract> {
    this.client = core.elasticsearch.client.asInternalUser;

    // A callback that runs on its own schedule (a task runner, a poller) neither waits for nor
    // triggers initialize(): it reads the status and no-ops until the plugin is available.
    this.heartbeat = interval(HEARTBEAT_INTERVAL_MS).subscribe(() => {
      if (this.initialization.getStatus().state !== 'available') {
        return;
      }
      this.logger.info(
        `heartbeat: initialized on this instance at ${this.instanceState?.initializedAt}`
      );
    });

    const contract: PluginInitializeExampleStartContract = {
      getDoc: () => this.getDoc(),
      getInstanceInfo: () => ({
        instanceUuid: this.instanceUuid,
        status: this.initialization.getStatus(),
        instanceState: this.instanceState,
      }),
    };

    const { slowStartMs } = this.config;
    return slowStartMs > 0 ? delay(slowStartMs).then(() => contract) : contract;
  }

  public stop(): void {
    this.statusSubscription.unsubscribe();
    this.heartbeat?.unsubscribe();
  }

  /**
   * Resolves at once when `available`, joins an attempt in flight, and otherwise starts one right
   * away, even while a background retry is still scheduled. Rejects with a
   * `PluginInitializationError` when that attempt fails.
   */
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
      // Unreachable in practice: core starts the HTTP server only after every plugin's start().
      throw new Error(`${PLUGIN_ID}: start() has not run yet`);
    }
    return client;
  }

  private renderHealthPage(): string {
    const status = JSON.stringify(toStatusBody(this.initialization.getStatus()), null, 2);
    return (
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
      `<title>${PLUGIN_ID} health</title></head><body><h1>${PLUGIN_ID}</h1>` +
      `<p>Served through core.http.resources, which core does not gate.</p>` +
      `<pre>${escape(status)}</pre></body></html>`
    );
  }
}
