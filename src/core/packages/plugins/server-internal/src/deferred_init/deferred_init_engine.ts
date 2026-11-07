/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, ReplaySubject, type Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { PluginInitStatus } from '@kbn/core-plugins-server';

/**
 * A plugin's `initialize()`, bound by `PluginsSystem` to the plugin's start context and
 * dependency contracts.
 */
export type PluginInitRunner = () => Promise<void>;

/** An `initialize()` still running after this long logs a warning. It is not a timeout. */
export const SLOW_INITIALIZE_WARNING_MS = 10_000;

interface DeferredInitRecord {
  readonly status$: BehaviorSubject<PluginInitStatus>;
  /** The plugin's single `initialize()` run. Rejects when it fails. */
  run?: Promise<void>;
}

/**
 * Tracks each plugin's `initialize()` on this Kibana instance and runs it once every plugin has
 * started, without holding boot.
 *
 * A failed `initialize()` is emitted on {@link DeferredInitEngine.failure$}, which `Root` turns
 * into a shutdown, the same outcome as a thrown `setup()` or `start()`.
 *
 * @internal
 */
export class DeferredInitEngine {
  private readonly records = new Map<string, DeferredInitRecord>();
  private readonly failures$ = new ReplaySubject<Error>(1);
  /**
   * Set once every plugin's `start()` has returned. Until then {@link initialize} rejects, since
   * waiting there would hold boot on deliberately expensive work.
   */
  private bootCompleted = false;

  /** Emits the error of every `initialize()` that fails. The latest is replayed to late subscribers. */
  public readonly failure$: Observable<Error> = this.failures$.asObservable();

  constructor(private readonly log: Logger) {}

  /** Status of a plugin, replaying the current value. Never triggers anything. */
  public status$(pluginId: string): Observable<PluginInitStatus> {
    return this.ensureRecord(pluginId).status$.asObservable();
  }

  /** Current status of a plugin, `idle` when unknown. Never triggers anything. */
  public getStatus(pluginId: string): PluginInitStatus {
    return this.records.get(pluginId)?.status$.value ?? 'idle';
  }

  /** Marks a plugin that has no `initialize()` as `available` once its `start()` has returned. */
  public markAvailable(pluginId: string): void {
    this.ensureRecord(pluginId).status$.next('available');
  }

  /**
   * Marks boot as completed and runs each plugin's `initialize()` without waiting for it, in the
   * given order.
   */
  public startInitialization(runners: ReadonlyMap<string, PluginInitRunner>): void {
    this.bootCompleted = true;
    for (const [pluginId, runner] of runners) {
      this.run(pluginId, this.ensureRecord(pluginId), runner);
    }
  }

  /**
   * Resolves once the plugin is `available` and rejects when its `initialize()` fails. Rejects
   * before boot has completed, and for a plugin that has not started on this instance.
   */
  public async initialize(pluginId: string): Promise<void> {
    if (!this.bootCompleted) {
      throw new Error(
        `Cannot wait for plugin "${pluginId}" to initialize before every plugin has started: ` +
          `it would block boot. Call initialize() from a route handler, a task runner, or a ` +
          `function returned from start() that runs after boot.`
      );
    }
    const record = this.records.get(pluginId);
    if (record?.status$.value === 'available') {
      return;
    }
    if (!record?.run) {
      throw new Error(`Plugin "${pluginId}" has not started on this Kibana instance.`);
    }
    return record.run;
  }

  private run(pluginId: string, record: DeferredInitRecord, runner: PluginInitRunner): void {
    const startedAt = performance.now();
    const slowTimer = setTimeout(() => {
      this.log.warn(
        `Plugin "${pluginId}" initialize() has been running for ` +
          `${Math.round((performance.now() - startedAt) / 1000)}s and has not finished.`
      );
    }, SLOW_INITIALIZE_WARNING_MS);
    // Node-only API; guard for environments where timers are mocked without `unref`.
    slowTimer.unref?.();

    this.log.debug(`Plugin "${pluginId}": running initialize().`);
    record.status$.next('initializing');

    // Calling the runner inside the chain turns a synchronous throw into a failed run.
    const run = Promise.resolve()
      .then(runner)
      .finally(() => clearTimeout(slowTimer))
      .then(
        () => {
          this.log.info(
            `Plugin "${pluginId}" initialized in ${Math.round(performance.now() - startedAt)}ms.`
          );
          record.status$.next('available');
        },
        (error: unknown) => {
          record.status$.next('failed');
          throw new Error(`Plugin "${pluginId}" initialize() failed: ${toMessage(error)}`, {
            cause: error,
          });
        }
      );
    // Reporting the failure also handles the rejection, so a run nobody awaits is not an
    // unhandled rejection. Callers of `initialize()` still get it.
    run.catch((error: Error) => this.failures$.next(error));
    record.run = run;
  }

  private ensureRecord(pluginId: string): DeferredInitRecord {
    const existing = this.records.get(pluginId);
    if (existing) {
      return existing;
    }
    const record = { status$: new BehaviorSubject<PluginInitStatus>('idle') };
    this.records.set(pluginId, record);
    return record;
  }
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
