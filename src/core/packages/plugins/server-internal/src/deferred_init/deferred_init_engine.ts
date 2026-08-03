/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, firstValueFrom, type Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { withLock, isLockAcquisitionError } from '@kbn/lock-manager';
import { DeferredInitializationError } from '@kbn/core-deferred-init-common';
import type { InitState, LazyInitContext } from '@kbn/core-plugins-server';
import { readDeferredInitState, writeDeferredInitOutcome } from './deferred_init_state';
import {
  DEFERRED_INIT_BACKOFF_BASE_MS,
  DEFERRED_INIT_BACKOFF_FACTOR,
  DEFERRED_INIT_BACKOFF_MAX_MS,
} from './backoff';

/** A plugin's deferred initialization work, bound to its {@link LazyInitContext}. */
export type DeferredInitRunner = (ctx: LazyInitContext) => Promise<void>;

interface DeferredInitRecord {
  readonly state$: BehaviorSubject<InitState>;
  runner?: DeferredInitRunner;
  ctx?: LazyInitContext;
  inFlight?: Promise<void>;
  lastError?: unknown;
  /** Consecutive failed runs since the last success; reset to 0 on success. */
  failedAttempts: number;
}

const LOCK_ID_PREFIX = 'deferred-init:';

type GuardedRunOutcome = 'available' | 'retry';

/**
 * Per-instance engine that tracks per-plugin deferred-init state and runs the work
 * lazily on demand. Nothing executes at construction or boot: the work runs only when
 * {@link DeferredInitEngine.ensureInitialized} or {@link DeferredInitEngine.trigger}
 * is called, which happens on the first gated request (or an explicit trigger), never
 * during `start()`.
 *
 * Re-entrancy, two layers:
 * - Same instance: a single in-flight promise per plugin id is shared across concurrent
 *   triggers (`record.inFlight`).
 * - Across instances behind a load balancer: {@link DeferredInitEngine.runGuarded} checks a
 *   cluster-global state doc first (skips the runner entirely if a peer already finished),
 *   then serializes the actual runner invocation with a distributed lock so at most one
 *   instance in the deployment runs it concurrently. A `failed` run, or one that lost the
 *   lock race, is retried after a jittered cooldown (see {@link scheduleCooldown}).
 *
 * @internal
 */
export class DeferredInitEngine {
  private readonly records = new Map<string, DeferredInitRecord>();
  private readonly retryAttempts = new Map<string, number>();
  /**
   * True only while the standard plugins' `start()` loop is running. While set,
   * {@link waitUntilAvailable} refuses to block (see the guard there): awaiting a lazy plugin's
   * deferred init during `start()` would stall the boot loop past its watchdog and defeat the
   * whole point of deferring the work.
   */
  private startCycleActive = false;

  constructor(private readonly log: Logger, private readonly kibanaVersion: string) {}

  /**
   * Mark the standard `start()` loop as in progress. Called by
   * {@link PluginsSystem.startPlugins} before the loop begins; every path that would block on
   * deferred init ({@link waitUntilAvailable}, and therefore `loadPluginContract` / `waitForInit`)
   * throws instead until {@link endStartCycle} clears it.
   */
  public beginStartCycle(): void {
    this.startCycleActive = true;
  }

  /** Clear the {@link beginStartCycle} flag once the `start()` loop has finished (or thrown). */
  public endStartCycle(): void {
    this.startCycleActive = false;
  }

  /**
   * Reserve a slot for a plugin id and set its state to `idle`. Called during setup so
   * the state endpoint and `/status` can reflect the plugin before its runner is attached.
   */
  public register(pluginId: string): void {
    this.ensureRecord(pluginId);
  }

  /**
   * Attach the deferred work and its context to a previously-registered plugin id. Called
   * during start (once internal-user clients are available). Does NOT run the work.
   */
  public setRunner(pluginId: string, runner: DeferredInitRunner, ctx: LazyInitContext): void {
    const record = this.ensureRecord(pluginId);
    record.runner = runner;
    record.ctx = ctx;
  }

  /**
   * Whether a plugin id opted into deferred initialization (i.e. {@link register} was called for
   * it during setup). Used by callers that only want to wait on {@link waitUntilAvailable} for
   * plugins that actually have deferred work, since {@link ensureRecord} would otherwise happily
   * create an `idle` record for any unknown plugin id.
   */
  public isRegistered(pluginId: string): boolean {
    return this.records.has(pluginId);
  }

  /** Current state for a plugin id (`idle` if unknown). Does not trigger anything. */
  public getState(pluginId: string): InitState {
    return this.records.get(pluginId)?.state$.value ?? 'idle';
  }

  /**
   * Details about a plugin's most recent failed run, or `undefined` unless it is currently
   * `failed`. Backs the status endpoint the initializing UI reads to show which plugin failed,
   * why, and how many consecutive attempts have failed.
   */
  public getFailureDetails(pluginId: string): { message: string; attempts: number } | undefined {
    const record = this.records.get(pluginId);
    if (!record || record.state$.value !== 'failed') {
      return undefined;
    }
    return {
      message:
        record.lastError instanceof Error ? record.lastError.message : String(record.lastError),
      attempts: record.failedAttempts,
    };
  }

  /** Observable of a plugin id's state. Registers the id if not yet known. */
  public state$(pluginId: string): Observable<InitState> {
    return this.ensureRecord(pluginId).state$.asObservable();
  }

  /**
   * Kick the deferred work if the plugin is `idle`, then return the current state immediately.
   * Never awaits completion: the first gated request therefore observes `initializing` (not a
   * hung connection).
   *
   * Deliberately does *not* re-kick a `failed` plugin here. Both the UI's status poll and every
   * gated route call this on each hit, so re-kicking on `failed` too would immediately flip it to
   * `initializing` again before the caller ever observes the failure, silently defeating
   * {@link scheduleCooldown}'s backoff and hiding the error from the initializing UI entirely. A
   * `failed` plugin becomes auto-kickable again once its cooldown elapses and flips it back to
   * `idle`; an explicit {@link trigger} call can still force a sooner retry.
   */
  public ensureInitialized(pluginId: string): InitState {
    const record = this.records.get(pluginId);
    if (!record) {
      return 'idle';
    }
    if (record.state$.value === 'idle') {
      this.kick(pluginId, record);
    }
    return record.state$.value;
  }

  /**
   * Explicitly kick the deferred work (if `idle`/`failed`) and return a promise that
   * resolves when the in-flight run settles. Used for programmatic triggers.
   */
  public trigger(pluginId: string): Promise<void> {
    const record = this.ensureRecord(pluginId);
    const state = record.state$.value;
    if (state === 'idle' || state === 'failed') {
      this.kick(pluginId, record);
    }
    return record.inFlight ?? Promise.resolve();
  }

  private kick(pluginId: string, record: DeferredInitRecord): void {
    if (record.inFlight) {
      return;
    }
    if (!record.runner || !record.ctx) {
      this.log.warn(
        `Deferred init for "${pluginId}" was triggered before its runner was registered; staying idle.`
      );
      return;
    }

    const { runner, ctx } = record;
    record.state$.next('initializing');
    this.log.info(`Deferred init for "${pluginId}" started.`);

    record.inFlight = this.runGuarded(pluginId, runner, ctx).then(
      (outcome) => {
        record.inFlight = undefined;
        if (outcome === 'available') {
          this.retryAttempts.delete(pluginId);
          record.failedAttempts = 0;
          record.state$.next('available');
          this.log.info(`Deferred init for "${pluginId}" completed; routes are now available.`);
        } else {
          // Another instance holds the lock (or just finished). Nothing went wrong here,
          // so stay `initializing` and let a cooldown flip us back to `idle` so the next
          // gated request (or status poll) re-checks, instead of retrying instantly.
          this.scheduleCooldown(pluginId, record);
        }
      },
      (error: unknown) => {
        record.inFlight = undefined;
        record.lastError = error;
        record.failedAttempts += 1;
        record.state$.next('failed');
        const message = error instanceof Error ? error.message : String(error);
        this.log.error(`Deferred init for "${pluginId}" failed: ${message}`);
        this.scheduleCooldown(pluginId, record);
      }
    );
  }

  /**
   * Wait until a plugin's deferred init is `available`, kicking (or re-kicking) it as needed.
   * Unlike {@link trigger}, this rejects on a terminal `failed` state instead of resolving —
   * `trigger`'s `inFlight` promise never rejects (failures are swallowed into state `failed`),
   * and on a lost-lock race it can resolve while state is still `initializing` (the run only
   * truly completes once a later cooldown flips it back to `idle` and it's re-kicked). Used by
   * `RuntimePluginContractResolver.loadPluginContract` to gate cross-plugin, in-process access to
   * a lazy plugin's `start()` contract.
   */
  public async waitUntilAvailable(pluginId: string): Promise<void> {
    // Guard against being awaited during the plugin `start()` loop. Blocking here would hold the
    // boot loop until this plugin's (deliberately expensive) deferred init finished, tripping the
    // per-plugin start watchdog and defeating lazy initialization. This is the enforcement point
    // for both cross-plugin `loadPluginContract` and a plugin's own `waitForInit` — the fix is to
    // move the call out of `start()` into a route handler, task runner, `lazyInitialize`, or a
    // function returned from `start()` that runs post-boot.
    if (this.startCycleActive) {
      throw new Error(
        `Cannot wait for deferred initialization of "${pluginId}" during the plugin start ` +
          `lifecycle: doing so blocks boot and defeats lazy initialization. Move this ` +
          `loadPluginContract()/waitForInit() call into a route handler, a task runner, your own ` +
          `lazyInitialize(), or a function returned from start() that is invoked post-boot.`
      );
    }

    const record = this.ensureRecord(pluginId);

    while (true) {
      const state = record.state$.value;
      if (state === 'available') {
        return;
      }
      if (!record.runner || !record.ctx) {
        // A misconfiguration (the plugin never called `setRunner`), not a transient failure of
        // the runner itself — retrying won't make a runner appear, so callers shouldn't spend
        // their retry budget on it.
        throw new DeferredInitializationError(pluginId, {
          message: `Deferred init for "${pluginId}" has no runner attached.`,
          retriable: false,
          status: record.state$.value,
        });
      }
      if (state === 'idle' || state === 'failed') {
        this.kick(pluginId, record);
      }
      await (record.inFlight ?? Promise.resolve());

      const settled = record.state$.value;
      if (settled === 'available') {
        return;
      }
      if (settled === 'failed') {
        throw new DeferredInitializationError(pluginId, {
          cause: record.lastError,
          status: 'failed',
        });
      }
      // `settled === 'initializing'`: lost the cross-instance lock race. Wait past the
      // cooldown (which flips this back to `idle`) before looping to retry.
      await firstValueFrom(record.state$.pipe(filter((s) => s !== 'initializing')));
    }
  }

  /**
   * Cross-instance-aware wrapper around a single run of a plugin's deferred init:
   *
   * 1. Read the shared state doc. If another instance already finished, adopt `available`
   *    without touching the plugin's runner at all (the common case once a plugin is warm).
   * 2. Otherwise, acquire a per-plugin distributed lock (`@kbn/lock-manager`) before running
   *    the plugin's (possibly expensive, not-safe-under-true-concurrency) work, so at most one
   *    instance in the cluster executes it at a time. Losing the race returns `'retry'` rather
   *    than running unlocked.
   * 3. On success, persist `available`. On failure, re-check the state doc first so a slow
   *    failure can never clobber a peer's already-recorded success.
   */
  private async runGuarded(
    pluginId: string,
    runner: DeferredInitRunner,
    ctx: LazyInitContext
  ): Promise<GuardedRunOutcome> {
    const { savedObjects, elasticsearch, logger } = ctx;

    const existing = await readDeferredInitState(savedObjects, logger, pluginId);
    // Only trust a stored `available` result if it was written by the same Kibana version.
    // On upgrade the SO is migrated but attributes persist, so a stale `available` from the
    // previous version must be treated as unknown and the runner re-executed.
    if (existing?.status === 'available' && existing.kibanaVersion === this.kibanaVersion) {
      return 'available';
    }

    try {
      // No explicit `LockManagerService.setup()` is needed before the first deferred-init trigger:
      // `withLock` acquires via `LockManager.acquire`, which lazily and idempotently bootstraps the
      // `.kibana_locks` index (`runSetupIndexAssetOnce`) on first use. So the very first trigger on
      // a fresh cluster creates the index itself. (See kbn-lock-manager's setup_lock_manager_index.)
      await withLock(
        { esClient: elasticsearch.client, logger, lockId: LOCK_ID_PREFIX + pluginId },
        () => runner(ctx)
      );
    } catch (error) {
      if (isLockAcquisitionError(error)) {
        this.log.debug(
          `Deferred init for "${pluginId}": lock held by another instance; will retry.`
        );
        return 'retry';
      }

      // The runner threw. Before recording a cluster-wide failure, make sure a peer that
      // raced us to completion didn't already succeed in the meantime.
      const latest = await readDeferredInitState(savedObjects, logger, pluginId);
      if (latest?.status === 'available' && latest.kibanaVersion === this.kibanaVersion) {
        return 'available';
      }
      await writeDeferredInitOutcome(
        savedObjects,
        logger,
        pluginId,
        'failed',
        latest?.attempts ?? existing?.attempts ?? 0,
        this.kibanaVersion,
        error
      );
      throw error;
    }

    // Always safe to write `available` here even under a race: every concurrent writer
    // converges on the same value.
    await writeDeferredInitOutcome(
      savedObjects,
      logger,
      pluginId,
      'available',
      existing?.attempts ?? 0,
      this.kibanaVersion
    );
    return 'available';
  }

  /**
   * Jittered, exponentially-backed-off cooldown before a plugin becomes retriable again.
   * Full jitter (not just a fixed delay) so instances that all lost the same lock race don't
   * retry in lockstep, mirroring Fleet's `backOff({ jitter: 'full' })` rationale.
   */
  private scheduleCooldown(pluginId: string, record: DeferredInitRecord): void {
    const attempt = (this.retryAttempts.get(pluginId) ?? 0) + 1;
    this.retryAttempts.set(pluginId, attempt);
    // Capped well under the lock's ~30s TTL.
    const upperBoundMs = Math.min(
      DEFERRED_INIT_BACKOFF_BASE_MS * DEFERRED_INIT_BACKOFF_FACTOR ** (attempt - 1),
      DEFERRED_INIT_BACKOFF_MAX_MS
    );
    const delayMs = Math.random() * upperBoundMs;

    const timer = setTimeout(() => {
      if (record.state$.value === 'initializing' || record.state$.value === 'failed') {
        record.state$.next('idle');
      }
    }, delayMs);
    // Node-only API; guard for environments/tests where timers are mocked without `unref`.
    timer.unref?.();
  }

  private ensureRecord(pluginId: string): DeferredInitRecord {
    let record = this.records.get(pluginId);
    if (!record) {
      record = { state$: new BehaviorSubject<InitState>('idle'), failedAttempts: 0 };
      this.records.set(pluginId, record);
    }
    return record;
  }
}
