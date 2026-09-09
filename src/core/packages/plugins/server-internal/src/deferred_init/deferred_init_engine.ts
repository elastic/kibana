/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { DeferredInitializationError } from '@kbn/core-deferred-init-common';
import type { InitState, LazyInitContext } from '@kbn/core-plugins-server';
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

/**
 * Per-instance engine that tracks per-plugin deferred-init state and runs the work
 * lazily on demand. Nothing executes at construction or boot: the work runs only when
 * {@link DeferredInitEngine.ensureInitialized} or {@link DeferredInitEngine.trigger}
 * is called, which happens on the first gated request (or an explicit trigger), never
 * during `start()`.
 *
 * State is per Kibana instance and in memory only, exactly like the `/status` entry of any
 * non-lazy plugin: nothing is persisted, and no cross-instance lock or shared document is
 * involved. Every instance behind a load balancer therefore runs each lazy plugin's
 * `lazyInitialize` once, on its own first trigger. That is deliberate — deferred init routinely
 * has to establish *instance-local* preconditions (downloading a browser binary, warming an
 * in-process cache, populating module-scoped state), which a run on some other instance cannot
 * satisfy. The cost is that `lazyInitialize` may run once per instance rather than once per
 * deployment, so it must be safe to execute concurrently on several instances against the same
 * Elasticsearch cluster (create-if-missing rather than blind create, idempotent writes).
 *
 * Within a single instance, concurrent triggers for the same plugin id share one in-flight
 * promise (`record.inFlight`), so a burst of requests produces exactly one run. A `failed` run
 * becomes retriable again after a jittered, exponentially-backed-off cooldown (see
 * {@link scheduleCooldown}), which also keeps instances that fail against the same unhealthy
 * cluster from retrying in lockstep.
 *
 * @internal
 */
export class DeferredInitEngine {
  private readonly records = new Map<string, DeferredInitRecord>();
  /**
   * True only while the standard plugins' `start()` loop is running. While set,
   * {@link waitUntilAvailable} refuses to block (see the guard there): awaiting a lazy plugin's
   * deferred init during `start()` would stall the boot loop past its watchdog and defeat the
   * whole point of deferring the work.
   */
  private startCycleActive = false;

  constructor(private readonly log: Logger) {}

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

    record.inFlight = runner(ctx).then(
      () => {
        record.inFlight = undefined;
        record.failedAttempts = 0;
        record.state$.next('available');
        this.log.info(`Deferred init for "${pluginId}" completed; routes are now available.`);
      },
      (error: unknown) => {
        record.inFlight = undefined;
        record.lastError = error;
        record.failedAttempts += 1;
        record.state$.next('failed');
        const message = error instanceof Error ? error.message : String(error);
        this.log.error(`Deferred init for "${pluginId}" failed: ${message}`);
        this.scheduleCooldown(record);
      }
    );
  }

  /**
   * Wait until a plugin's deferred init is `available`, kicking (or re-kicking) it as needed.
   * Unlike {@link trigger}, this rejects on a `failed` run instead of resolving — `trigger`'s
   * `inFlight` promise never rejects (failures are swallowed into state `failed`). Used by
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
        status: state,
      });
    }
    if (state === 'idle' || state === 'failed') {
      this.kick(pluginId, record);
    }
    // Either the run this call kicked, or one a concurrent caller already had in flight.
    await (record.inFlight ?? Promise.resolve());

    // Annotated rather than inferred: TypeScript would otherwise carry the pre-`await` narrowing
    // of `state` through to here, even though the run we just awaited is what changed it.
    const settled: InitState = record.state$.value;
    if (settled === 'available') {
      return;
    }
    throw new DeferredInitializationError(pluginId, {
      cause: record.lastError,
      status: settled,
    });
  }

  /**
   * Jittered, exponentially-backed-off cooldown before a failed plugin becomes retriable again
   * (flipping it from `failed` back to `idle`). Full jitter, rather than a fixed delay, so a set
   * of instances that all failed against the same unhealthy Elasticsearch cluster don't retry in
   * lockstep, mirroring Fleet's `backOff({ jitter: 'full' })` rationale.
   */
  private scheduleCooldown(record: DeferredInitRecord): void {
    const upperBoundMs = Math.min(
      DEFERRED_INIT_BACKOFF_BASE_MS * DEFERRED_INIT_BACKOFF_FACTOR ** (record.failedAttempts - 1),
      DEFERRED_INIT_BACKOFF_MAX_MS
    );
    const delayMs = Math.random() * upperBoundMs;

    const timer = setTimeout(() => {
      if (record.state$.value === 'failed') {
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
