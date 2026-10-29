/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import {
  openPortSession,
  remoteTokenId,
  type RemoteModule,
  type RemoteWorkerSpec,
} from '@kbn/core-remote-common';
import type { Logger } from '@kbn/logging';
import type { ServiceToken } from '@kbn/core-di';
import type {
  RemoteBackend,
  RemoteRegistration,
  RemoteSession,
  RemoteSetup,
  ScopeLookup,
} from '@kbn/core-remote-server';
import { createManagedWorker, type ManagedWorker } from '@kbn/core-threads-server-internal';
import { buildExecutor } from './build_executor';
import { CoordinatorGateway } from './coordinator_gateway';

const loadModule = createRequire(__filename);
const ENTRY = loadModule.resolve('./remote_worker_entry');

/**
 * Core-owned remote execution host. Plugins register graphs and bind coordinator
 * capabilities; this service selects the backend and owns the worker connection.
 */
export class RemoteService implements RemoteSetup {
  private readonly modules: RemoteModule[] = [];
  private readonly registrations = new Map<string, RemoteRegistration>();
  private readonly bindings = new Map<string, (scopes: ScopeLookup) => object>();
  private readonly scopes = new Map<string, unknown>();
  private readonly sessions = new Map<string, Promise<RemoteSession<unknown>>>();
  private readonly resolvers = new Map<string, (session: RemoteSession<unknown>) => void>();
  private readonly workers: ManagedWorker[] = [];
  private readonly ports: MessagePort[] = [];
  private started = false;
  private readonly lookup: ScopeLookup = {
    get: <T>(scopeId: string): T => {
      if (!this.scopes.has(scopeId)) {
        throw new Error(`Unknown remote invocation scope "${scopeId}"`);
      }
      return this.scopes.get(scopeId) as T;
    },
  };

  constructor(
    private readonly logger: Logger,
    private readonly limits: { maxOldGenerationSizeMb: number } = { maxOldGenerationSizeMb: 1024 }
  ) {}

  public discover(pluginPaths: readonly string[]): void {
    for (const pluginPath of pluginPaths) {
      const tsEntry = join(pluginPath, 'server', 'remote', 'index.ts');
      const jsEntry = join(pluginPath, 'server', 'remote', 'index.js');
      const entry = existsSync(tsEntry) ? tsEntry : existsSync(jsEntry) ? jsEntry : undefined;
      if (!entry) continue;
      // Discovery loads the declaration entry only. Implementation modules stay behind their declared paths.
      const loaded = loadModule(entry) as { remoteModule?: RemoteModule };
      if (!loaded.remoteModule) {
        throw new Error(`${entry} must export remoteModule`);
      }
      this.modules.push(loaded.remoteModule);
      this.logger.info(`Discovered remote module ${entry}`);
    }
  }

  public register(registration: RemoteRegistration): void {
    if (this.registrations.has(registration.id)) {
      throw new Error(`Remote graph "${registration.id}" is already registered`);
    }
    this.registrations.set(registration.id, registration);
    this.sessions.set(
      registration.id,
      new Promise((resolve) => {
        this.resolvers.set(registration.id, resolve);
      })
    );
  }

  public bind(token: ServiceToken<unknown>, factory: (scopes: ScopeLookup) => object): void {
    this.bindings.set(remoteTokenId(token), factory);
  }

  public whenReady<T>(id: string): Promise<RemoteSession<T>> {
    const pending = this.sessions.get(id);
    if (!pending) {
      return Promise.reject(new Error(`Remote graph "${id}" is not registered`));
    }
    return pending as Promise<RemoteSession<T>>;
  }

  public async start(backend: RemoteBackend): Promise<void> {
    if (this.started) return;
    this.started = true;
    if (this.registrations.size === 0) {
      this.logger.info('No remote graphs registered; skipping remote startup');
      return;
    }
    this.logger.info(`Starting remote execution with backend "${backend}"`);
    for (const registration of this.registrations.values()) {
      const spec = this.buildSpec(registration);
      const coordinator = this.materializeCoordinator(spec);
      if (backend === 'in_process') {
        this.startInProcess(registration.id, spec, coordinator);
      } else {
        await this.startWorker(registration.id, spec, coordinator);
      }
    }
  }

  public async stop(): Promise<void> {
    for (const port of this.ports) {
      port.close();
    }
    this.ports.length = 0;
    await Promise.all(this.workers.map((worker) => worker.stop()));
    this.workers.length = 0;
  }

  private buildSpec(registration: RemoteRegistration): RemoteWorkerSpec {
    const kindIds = new Set(registration.contributions.map((kind) => remoteTokenId(kind)));
    const rootId = remoteTokenId(registration.root);
    const dependencyIds = new Set(
      (registration.dependencies ?? []).map((token) => remoteTokenId(token))
    );
    let root: RemoteWorkerSpec['root'] | undefined;
    let catalog: RemoteWorkerSpec['catalog'];
    const executorProviders: RemoteWorkerSpec['executorProviders'][number][] = [];
    const contributions: RemoteWorkerSpec['contributions'][number][] = [];
    const coordinatorTokenIds: string[] = [];

    const relevant = this.modules.filter((remoteModule) => {
      const selectedProvider = (remoteModule.providers ?? []).some((provider) => {
        const id = remoteTokenId(provider.token);
        return id === rootId || dependencyIds.has(id);
      });
      const selectedContribution = (remoteModule.contributions ?? []).some((contribution) =>
        kindIds.has(remoteTokenId(contribution.kind))
      );
      return selectedProvider || selectedContribution;
    });

    for (const remoteModule of relevant) {
      for (const provider of remoteModule.providers ?? []) {
        const id = remoteTokenId(provider.token);
        if (provider.role === 'root') {
          if (id !== rootId) continue;
          if (root) {
            throw new Error(`Remote graph "${registration.id}" has more than one root provider`);
          }
          root = { tokenId: id, modulePath: provider.modulePath, exportName: provider.exportName };
          continue;
        }
        if (provider.placement === 'coordinator') {
          if (!coordinatorTokenIds.includes(id)) coordinatorTokenIds.push(id);
          continue;
        }
        if (provider.role === 'catalog') {
          if (!dependencyIds.has(id)) continue;
          if (catalog) {
            throw new Error(
              `Remote graph "${registration.id}" has more than one catalogue provider`
            );
          }
          catalog = {
            tokenId: id,
            modulePath: provider.modulePath,
            exportName: provider.exportName,
          };
          continue;
        }
        executorProviders.push({
          tokenId: id,
          modulePath: provider.modulePath,
          exportName: provider.exportName,
        });
      }
      for (const contribution of remoteModule.contributions ?? []) {
        if (!kindIds.has(remoteTokenId(contribution.kind))) continue;
        contributions.push({
          stepType: contribution.stepType,
          modulePath: contribution.modulePath,
          exportName: contribution.exportName,
        });
      }
    }

    for (const id of dependencyIds) {
      const provided =
        catalog?.tokenId === id ||
        coordinatorTokenIds.includes(id) ||
        executorProviders.some((provider) => provider.tokenId === id);
      if (!provided) {
        throw new Error(`Remote graph "${registration.id}" is missing dependency "${id}"`);
      }
    }

    if (!root) {
      throw new Error(`Remote graph "${registration.id}" has no executor provider for its root`);
    }
    return {
      id: registration.id,
      root,
      catalog,
      executorProviders,
      contributions,
      coordinatorTokenIds,
    };
  }

  private materializeCoordinator(spec: RemoteWorkerSpec): Map<string, object> {
    const coordinator = new Map<string, object>();
    for (const id of spec.coordinatorTokenIds) {
      const factory = this.bindings.get(id);
      if (!factory) {
        throw new Error(`Coordinator capability "${id}" was declared but not bound`);
      }
      coordinator.set(id, factory(this.lookup));
    }
    return coordinator;
  }

  private openSession<T>(id: string, stub: T): void {
    const session: RemoteSession<T> = {
      stub,
      openScope: (state) => {
        const scopeId = randomUUID();
        this.scopes.set(scopeId, state);
        return scopeId;
      },
      closeScope: (scopeId) => {
        this.scopes.delete(scopeId);
      },
      getScope: <TState>(scopeId: string) => this.lookup.get<TState>(scopeId),
    };
    const resolve = this.resolvers.get(id);
    if (!resolve) {
      throw new Error(`Remote graph "${id}" has no readiness waiter`);
    }
    resolve(session as RemoteSession<unknown>);
  }

  private startInProcess(
    id: string,
    spec: RemoteWorkerSpec,
    coordinator: Map<string, object>
  ): void {
    const executor = buildExecutor(spec, coordinator, []);
    this.openSession(id, executor);
    this.logger.info(`Remote graph "${id}" ready in-process`);
  }

  private async startWorker(
    id: string,
    spec: RemoteWorkerSpec,
    coordinator: Map<string, object>
  ): Promise<void> {
    const { port1, port2 } = new MessageChannel();
    this.ports.push(port1);
    const gateway = new CoordinatorGateway(coordinator);
    // Session is established before the worker runs so capability lookups during ready can land.
    const stub = openPortSession(port1, gateway);
    const worker = createManagedWorker({
      name: `remote:${id}`,
      entry: ENTRY,
      workerData: spec,
      connectionPort: port2,
      resourceLimits: { maxOldGenerationSizeMb: this.limits.maxOldGenerationSizeMb },
      logger: this.logger,
      unref: true,
      // A transferred port cannot be reused. A replacement worker needs a new port; this handle does not restart.
      restart: { maxAttempts: 0 },
      readyTimeoutMs: 120_000,
      onExit: (info) => {
        this.logger.warn(
          `Remote graph "${id}" worker exited (${info.reason}); outstanding calls fail and are not replayed`
        );
        port1.close();
      },
    });
    this.workers.push(worker);
    worker.start();
    await worker.ready();
    this.openSession(id, stub);
    this.logger.info(`Remote graph "${id}" ready on worker thread ${worker.status().threadId}`);
  }
}
