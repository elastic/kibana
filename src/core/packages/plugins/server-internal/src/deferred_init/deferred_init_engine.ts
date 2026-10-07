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
import { PluginInitializationError } from '@kbn/core-deferred-init-common';
import type { PluginInitState, PluginInitStatus } from '@kbn/core-deferred-init-common';
import {
  DEFERRED_INIT_BACKOFF_BASE_MS,
  DEFERRED_INIT_BACKOFF_FACTOR,
  DEFERRED_INIT_BACKOFF_MAX_MS,
  DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS,
  DEFERRED_INIT_SLOW_ATTEMPT_WARNING_MS,
} from './backoff';

/**
 * One attempt at a plugin's `initialize()`, bound by `PluginsSystem` to the plugin's start
 * context and injected dependency contracts.
 */
export type PluginInitRunner = () => Promise<void>;

/** The boot lifecycles during which the engine refuses to block on a plugin's initialization. */
export type PluginLifecyclePhase = 'setup' | 'start';

/** A scheduled background retry; `promise` settles once the retry has been kicked or cancelled. */
interface DeferredInitCooldown {
  readonly promise: Promise<void>;
  readonly timer: NodeJS.Timeout;
  readonly resolve: () => void;
}

interface DeferredInitRecord {
  readonly status$: BehaviorSubject<PluginInitStatus>;
  runner?: PluginInitRunner;
  /** The running attempt. Never rejects: the settle handlers record the outcome instead. */
  inFlight?: Promise<void>;
  /** Consecutive failed attempts since the last success; reset to 0 on success. */
  failedAttempts: number;
  lastError?: Error;
  cooldown?: DeferredInitCooldown;
  emitting?: boolean;
  pendingEmissions?: PluginInitStatus[];
}

// Leaves the `lastError` key out entirely when there is no error, so status consumers and JSON
// bodies only ever see it while it is meaningful.
const toStatus = (state: PluginInitState, attempts: number, lastError?: Error): PluginInitStatus =>
  lastError ? { state, attempts, lastError } : { state, attempts };

/**
 * Per-instance engine that tracks each plugin's `initialize()` status and runs attempts on
 * demand. Core alone decides when an attempt runs: {@link DeferredInitEngine.ensureInitialized}
 * kicks one without waiting (gated routes), {@link DeferredInitEngine.initialize} and
 * {@link DeferredInitEngine.waitUntilAvailable} kick one and await it (for the plugin itself and
 * for its dependents, respectively), and the cooldown timer re-kicks a `failed` plugin in the
 * background.
 *
 * State is per Kibana instance and in memory only, exactly like the `/status` entry of any other
 * plugin: nothing is persisted and no cross-instance lock is involved, so every instance behind a
 * load balancer runs each plugin's `initialize()` itself. That is deliberate: `initialize()`
 * routinely has to establish instance-local preconditions (downloading a browser binary, warming
 * an in-process cache, populating module-scoped state) that a run on another instance cannot
 * satisfy. The cost is that `initialize()` may run once per instance rather than once per
 * deployment, so it must be safe to execute concurrently on several instances against the same
 * Elasticsearch cluster.
 *
 * Within one instance, concurrent triggers for the same plugin share one in-flight attempt
 * (`record.inFlight`), so a burst of requests produces exactly one attempt. A `failed` attempt is
 * retried after a jittered, exponentially backed-off cooldown (see {@link scheduleCooldown}),
 * which also keeps instances that fail against the same unhealthy cluster from retrying in
 * lockstep.
 *
 * @internal
 */
export class DeferredInitEngine {
  private readonly records = new Map<string, DeferredInitRecord>();
  /**
   * Set while `PluginsSystem` runs the plugins' `setup()` or `start()` loop. Awaiting a plugin's
   * initialization there would hold boot until deliberately expensive work finished, so
   * {@link initialize} and {@link waitUntilAvailable} reject while it is set.
   */
  private activeLifecycle?: PluginLifecyclePhase;

  constructor(private readonly log: Logger) {}

  /** Marks the given boot lifecycle as in progress until {@link endLifecycle} is called. */
  public beginLifecycle(phase: PluginLifecyclePhase): void {
    this.activeLifecycle = phase;
  }

  /** Clears the lifecycle set by {@link beginLifecycle} once its loop has finished or thrown. */
  public endLifecycle(): void {
    this.activeLifecycle = undefined;
  }

  /** Creates an `idle` record for a plugin that declares `initialize()`, so its status is readable before its runner is attached. */
  public register(pluginId: string): void {
    this.ensureRecord(pluginId);
  }

  /** Attaches the plugin's `initialize()` attempt to its record without running it. */
  public setRunner(pluginId: string, runner: PluginInitRunner): void {
    this.ensureRecord(pluginId).runner = runner;
  }

  /** Marks a plugin that has no `initialize()` as `available` once its `start()` has returned. */
  public markAvailable(pluginId: string): void {
    this.emit(this.ensureRecord(pluginId), toStatus('available', 0));
  }

  /** Current status of a plugin id (`idle` with no attempts if unknown); never creates a record or triggers anything. */
  public getStatus(pluginId: string): PluginInitStatus {
    return this.records.get(pluginId)?.status$.value ?? toStatus('idle', 0);
  }

  /** Status of a plugin id, replaying the current value; creates an `idle` record if needed and never triggers anything. */
  public status$(pluginId: string): Observable<PluginInitStatus> {
    return this.ensureRecord(pluginId).status$.asObservable();
  }

  /**
   * Starts an attempt if the plugin is `idle`, or `failed` with its background retries exhausted,
   * and returns the current state without waiting. This backs every gated request, so it is not
   * subject to the lifecycle guard, and it deliberately leaves a `failed` plugin alone while a
   * background retry is scheduled: re-kicking on every hit would flip the state to `initializing`
   * before any caller observed the failure, defeating the backoff.
   */
  public ensureInitialized(pluginId: string): PluginInitState {
    const record = this.records.get(pluginId);
    if (!record) {
      return 'idle';
    }
    const { state } = record.status$.value;
    if (state === 'idle' || (state === 'failed' && !record.cooldown)) {
      this.kick(pluginId, record);
    }
    return record.status$.value.state;
  }

  /**
   * Makes sure the plugin is initialized, on the plugin's own behalf: resolves once `available`,
   * joins an in-flight attempt, and otherwise starts one immediately, cancelling any scheduled
   * background retry. Rejects with a {@link PluginInitializationError} when the attempt fails,
   * and with a plain error while a boot lifecycle is active.
   */
  public async initialize(pluginId: string): Promise<void> {
    this.assertOutsideLifecycle(pluginId);
    const record = this.ensureRecord(pluginId);
    if (record.status$.value.state === 'available') {
      return;
    }
    if (record.inFlight) {
      await record.inFlight;
    } else {
      // `idle`, or `failed` with or without a pending cooldown: a plugin asking for itself does not
      // wait out the backoff.
      await this.runAttempt(pluginId, record);
    }
    this.assertAvailable(pluginId, record);
  }

  /**
   * Waits until the plugin is `available`, on a dependent's behalf: joins an in-flight attempt,
   * waits out a scheduled background retry rather than bypassing it, and otherwise starts an
   * attempt. Observes exactly one attempt, so it rejects with a {@link PluginInitializationError}
   * if that attempt fails; it also rejects with a plain error while a boot lifecycle is active.
   */
  public async waitUntilAvailable(pluginId: string): Promise<void> {
    this.assertOutsideLifecycle(pluginId);
    const record = this.ensureRecord(pluginId);
    if (record.status$.value.state === 'available') {
      return;
    }
    const { inFlight, cooldown } = record;
    if (inFlight) {
      await inFlight;
    } else if (cooldown) {
      // Wakes when the timer kicks the retry, or when a self `initialize()` cancels the cooldown
      // and starts one; either way the attempt to join is in flight by then, unless it has already
      // settled.
      await cooldown.promise;
      const kicked = record.inFlight;
      if (kicked) {
        await kicked;
      }
    } else {
      await this.runAttempt(pluginId, record);
    }
    this.assertAvailable(pluginId, record);
  }

  private assertOutsideLifecycle(pluginId: string): void {
    const phase = this.activeLifecycle;
    if (phase) {
      throw new Error(
        `Cannot wait for plugin "${pluginId}" to initialize during the plugin ${phase} lifecycle: ` +
          `it would block boot. Call initialize() from a route handler, a task runner, or a ` +
          `function returned from start() that runs after boot.`
      );
    }
  }

  /** Kicks an attempt and awaits it; rejects as non-retriable when there is no runner to run. */
  private async runAttempt(pluginId: string, record: DeferredInitRecord): Promise<void> {
    this.kick(pluginId, record);
    const { inFlight } = record;
    if (!inFlight) {
      throw new PluginInitializationError(pluginId, {
        retriable: false,
        status: record.status$.value.state,
        message:
          `Plugin "${pluginId}" cannot be initialized: it has not started on this Kibana ` +
          `instance yet, or it is disabled or has no server side.`,
      });
    }
    await inFlight;
  }

  private assertAvailable(pluginId: string, record: DeferredInitRecord): void {
    const { state } = record.status$.value;
    if (state !== 'available') {
      throw new PluginInitializationError(pluginId, { cause: record.lastError, status: state });
    }
  }

  private kick(pluginId: string, record: DeferredInitRecord): void {
    if (record.inFlight) {
      return;
    }
    const { runner, failedAttempts, lastError } = record;
    if (!runner) {
      this.log.warn(
        `Plugin "${pluginId}" was asked to initialize before its start() ran on this instance; ` +
          `staying ${record.status$.value.state}.`
      );
      return;
    }

    // A pending cooldown belongs to the failure this attempt supersedes. Stop its timer so it
    // cannot start a second attempt, but wake its waiters only once `inFlight` exists so they
    // join this attempt.
    const cancelled = record.cooldown;
    if (cancelled) {
      clearTimeout(cancelled.timer);
      record.cooldown = undefined;
    }

    const startedAt = performance.now();
    const slowTimer = setTimeout(() => {
      this.log.warn(
        `Plugin "${pluginId}" initialize() has been running for ` +
          `${Math.round((performance.now() - startedAt) / 1000)}s and has not finished. ` +
          `Its routes and apps stay unavailable until it does.`
      );
    }, DEFERRED_INIT_SLOW_ATTEMPT_WARNING_MS);
    // Node-only API; guard for environments/tests where timers are mocked without `unref`.
    slowTimer.unref?.();

    // Calling the runner inside the chain turns a synchronous throw into a failed attempt rather
    // than an exception escaping a request or a timer callback.
    record.inFlight = Promise.resolve()
      .then(() => runner())
      .then(
        () => {
          clearTimeout(slowTimer);
          this.onAttemptSucceeded(pluginId, record, performance.now() - startedAt);
        },
        (error: unknown) => {
          clearTimeout(slowTimer);
          this.onAttemptFailed(pluginId, record, error);
        }
      );
    cancelled?.resolve();

    this.log.info(
      failedAttempts === 0
        ? `Plugin "${pluginId}": running initialize().`
        : `Plugin "${pluginId}": retrying initialize() (${failedAttempts} failed attempt(s) so far).`
    );
    this.emit(record, toStatus('initializing', failedAttempts, lastError));
  }

  /**
   * Emits through the record's subject, queueing emissions requested while one is in progress
   * (a subscriber that re-kicks synchronously) so every subscriber sees them in order. While an
   * emission is in progress the subject's value lags behind the queued transitions, so
   * `getStatus()` and `ensureInitialized()` called from inside a subscriber report the state
   * before them.
   */
  private emit(record: DeferredInitRecord, status: PluginInitStatus): void {
    if (record.emitting) {
      record.pendingEmissions = [...(record.pendingEmissions ?? []), status];
      return;
    }
    record.emitting = true;
    try {
      record.status$.next(status);
      while (record.pendingEmissions?.length) {
        const [next, ...rest] = record.pendingEmissions;
        record.pendingEmissions = rest;
        record.status$.next(next);
      }
    } finally {
      record.emitting = false;
      record.pendingEmissions = undefined;
    }
  }

  private onAttemptSucceeded(
    pluginId: string,
    record: DeferredInitRecord,
    durationMs: number
  ): void {
    record.inFlight = undefined;
    record.failedAttempts = 0;
    record.lastError = undefined;
    this.log.info(
      `Plugin "${pluginId}" initialized in ${Math.round(
        durationMs
      )}ms; its routes and apps are now served.`
    );
    this.emit(record, toStatus('available', 0));
  }

  private onAttemptFailed(pluginId: string, record: DeferredInitRecord, error: unknown): void {
    const lastError = error instanceof Error ? error : new Error(String(error));
    record.inFlight = undefined;
    record.failedAttempts += 1;
    record.lastError = lastError;
    const { failedAttempts } = record;
    // Scheduled before emitting so a synchronous subscriber that reacts to `failed` already sees
    // the cooldown and takes the right path.
    const delayMs = this.scheduleCooldown(pluginId, record);
    const nextStep =
      delayMs === undefined
        ? 'No more background retries; the next request or initialize() call will try again.'
        : `Retrying in ${Math.round(delayMs / 1000)}s.`;
    this.log.error(
      `Plugin "${pluginId}" initialize() failed (attempt ${failedAttempts}): ${lastError.message}. ${nextStep}`
    );
    this.emit(record, toStatus('failed', failedAttempts, lastError));
  }

  /**
   * Arms a jittered, exponentially backed-off timer that re-kicks the plugin if it is still
   * `failed`, and returns the delay; returns `undefined` once
   * {@link DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS} consecutive failures have accumulated, after
   * which only on-demand kicks retry. Full jitter keeps instances that failed against the same
   * unhealthy cluster from retrying in lockstep, mirroring Fleet's `backOff({ jitter: 'full' })`.
   */
  private scheduleCooldown(pluginId: string, record: DeferredInitRecord): number | undefined {
    if (record.failedAttempts >= DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS) {
      return undefined;
    }
    const upperBoundMs = Math.min(
      DEFERRED_INIT_BACKOFF_BASE_MS * DEFERRED_INIT_BACKOFF_FACTOR ** (record.failedAttempts - 1),
      DEFERRED_INIT_BACKOFF_MAX_MS
    );
    const delayMs = Math.random() * upperBoundMs;

    const { promise, resolve } = Promise.withResolvers<void>();
    const timer = setTimeout(() => {
      // Only the live cooldown may act: kick() cancels and replaces the one it supersedes.
      if (record.cooldown?.promise !== promise) {
        return;
      }
      record.cooldown = undefined;
      try {
        if (record.status$.value.state === 'failed') {
          this.kick(pluginId, record);
        }
      } finally {
        resolve();
      }
    }, delayMs);
    // Node-only API; guard for environments/tests where timers are mocked without `unref`.
    timer.unref?.();
    record.cooldown = { promise, timer, resolve };
    return delayMs;
  }

  private ensureRecord(pluginId: string): DeferredInitRecord {
    let record = this.records.get(pluginId);
    if (!record) {
      record = {
        status$: new BehaviorSubject<PluginInitStatus>(toStatus('idle', 0)),
        failedAttempts: 0,
      };
      this.records.set(pluginId, record);
    }
    return record;
  }
}
