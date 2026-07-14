/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, firstValueFrom, type Observable } from 'rxjs';
import { metrics, ValueType, type Counter, type Histogram } from '@opentelemetry/api';
import type { Logger } from '@kbn/logging';
import { withLock, isLockAcquisitionError } from '@kbn/lock-manager';
import { DeferredInitializationError } from '@kbn/core-deferred-init-common';
import type { InitState, LazyInitContext } from '@kbn/core-plugins-server';
import { withActiveSpan } from '@kbn/tracing-utils';
import { readDeferredInitState, writeDeferredInitOutcome } from './deferred_init_state';
import {
  DEFERRED_INIT_BACKOFF_BASE_MS,
  DEFERRED_INIT_BACKOFF_FACTOR,
  DEFERRED_INIT_BACKOFF_MAX_MS,
} from './backoff';

/** A plugin's deferred initialization work, bound to its {@link LazyInitContext}. */
export type DeferredInitRunner = (ctx: LazyInitContext) => Promise<void>;

/**
 * What caused a plugin's deferred init to be kicked for the first time on this process.
 * Recorded as span attributes and metric dimensions so teams can answer "which route/plugin
 * first woke up our plugin in production".
 *
 * @public
 */
export type InitTrigger =
  | { readonly type: 'http_route'; readonly path: string }
  | { readonly type: 'contract'; readonly callerPlugin: string }
  | { readonly type: 'explicit' };

interface DeferredInitRecord {
  readonly state$: BehaviorSubject<InitState>;
  runner?: DeferredInitRunner;
  ctx?: LazyInitContext;
  inFlight?: Promise<void>;
  lastError?: unknown;
  /** Consecutive failed runs since the last success; reset to 0 on success. */
  failedAttempts: number;
  /** Set on the first kick; not updated on subsequent retries. */
  firstTrigger?: InitTrigger;
  /** process.hrtime.bigint() captured when the plugin first transitions to 'initializing'. */
  initStartedAtNs?: bigint;
}

const LOCK_ID_PREFIX = 'deferred-init:';
const METER_NAME = 'kibana.plugins';

type GuardedRunOutcome = 'available' | 'retry';

/** Lazily-initialized OTel instruments — created on first use so the global meter is ready. */
interface DeferredInitInstruments {
  readonly durationHistogram: Histogram;
  readonly attemptsCounter: Counter;
  readonly timeToAvailableHistogram: Histogram;
}

let instruments: DeferredInitInstruments | undefined;

const getInstruments = (): DeferredInitInstruments => {
  if (!instruments) {
    const meter = metrics.getMeter(METER_NAME);
    instruments = {
      durationHistogram: meter.createHistogram('kibana.plugin.deferred_init.duration_ms', {
        description:
          'Wall-clock duration of a single lazyInitialize() run, from lock acquisition to runner return.',
        unit: 'ms',
        valueType: ValueType.DOUBLE,
      }),
      attemptsCounter: meter.createCounter('kibana.plugin.deferred_init.attempts_total', {
        description: 'Cumulative count of lazyInitialize() run attempts, broken down by outcome.',
        unit: '1',
        valueType: ValueType.INT,
      }),
      timeToAvailableHistogram: meter.createHistogram(
        'kibana.plugin.deferred_init.time_to_available_ms',
        {
          description:
            'Elapsed time from process start until a plugin first reaches the available state. ' +
            'A low value means the plugin is used immediately after boot (effectively eager); a ' +
            'high value confirms the lazy-init benefit is real in production.',
          unit: 'ms',
          valueType: ValueType.DOUBLE,
        }
      ),
    };
  }
  return instruments;
};

const triggerAttributes = (trigger: InitTrigger | undefined): Record<string, string> => {
  if (!trigger) {
    return { 'trigger.type': 'unknown', 'trigger.detail': '—' };
  }
  switch (trigger.type) {
    case 'http_route':
      return { 'trigger.type': 'http_route', 'trigger.detail': trigger.path };
    case 'contract':
      return { 'trigger.type': 'contract', 'trigger.detail': trigger.callerPlugin };
    case 'explicit':
      return { 'trigger.type': 'explicit', 'trigger.detail': '—' };
  }
};

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
  /** Captured at construction (early in server boot) for time-to-available measurements. */
  private readonly engineStartedAtNs = process.hrtime.bigint();

  constructor(private readonly log: Logger, private readonly kibanaVersion: string) {}

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
  public ensureInitialized(pluginId: string, trigger?: InitTrigger): InitState {
    const record = this.records.get(pluginId);
    if (!record) {
      return 'idle';
    }
    if (record.state$.value === 'idle') {
      this.kick(pluginId, record, trigger);
    }
    return record.state$.value;
  }

  /**
   * Explicitly kick the deferred work (if `idle`/`failed`) and return a promise that
   * resolves when the in-flight run settles. Used for programmatic triggers.
   */
  public trigger(pluginId: string, trigger?: InitTrigger): Promise<void> {
    const record = this.ensureRecord(pluginId);
    const state = record.state$.value;
    if (state === 'idle' || state === 'failed') {
      this.kick(pluginId, record, trigger);
    }
    return record.inFlight ?? Promise.resolve();
  }

  private kick(pluginId: string, record: DeferredInitRecord, trigger?: InitTrigger): void {
    if (record.inFlight) {
      return;
    }
    if (!record.runner || !record.ctx) {
      this.log.warn(
        `Deferred init for "${pluginId}" was triggered before its runner was registered; staying idle.`
      );
      return;
    }

    // Only record the trigger that first woke up the plugin; retries inherit the original.
    if (!record.firstTrigger && trigger) {
      record.firstTrigger = trigger;
    }

    const { runner, ctx } = record;
    record.state$.next('initializing');
    record.initStartedAtNs = process.hrtime.bigint();
    this.log.info(`Deferred init for "${pluginId}" started.`);

    record.inFlight = this.runGuarded(pluginId, runner, ctx, record.firstTrigger).then(
      (outcome) => {
        record.inFlight = undefined;
        if (outcome === 'available') {
          const elapsedFromEngineStartMs =
            Number(process.hrtime.bigint() - this.engineStartedAtNs) / 1e6;
          const inst = getInstruments();
          const commonAttrs = {
            'plugin.id': pluginId,
            ...triggerAttributes(record.firstTrigger),
          };
          inst.timeToAvailableHistogram.record(elapsedFromEngineStartMs, commonAttrs);

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
  public async waitUntilAvailable(pluginId: string, trigger?: InitTrigger): Promise<void> {
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
        });
      }
      if (state === 'idle' || state === 'failed') {
        this.kick(pluginId, record, trigger);
      }
      await (record.inFlight ?? Promise.resolve());

      const settled = record.state$.value;
      if (settled === 'available') {
        return;
      }
      if (settled === 'failed') {
        throw new DeferredInitializationError(pluginId, { cause: record.lastError });
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
   *
   * Emits an OTel span (child of the triggering HTTP request span when available) and records
   * duration + attempt-count metrics for every run.
   */
  private async runGuarded(
    pluginId: string,
    runner: DeferredInitRunner,
    ctx: LazyInitContext,
    trigger: InitTrigger | undefined
  ): Promise<GuardedRunOutcome> {
    const { savedObjects, elasticsearch, logger } = ctx;
    const inst = getInstruments();
    const commonAttrs = {
      'plugin.id': pluginId,
      ...triggerAttributes(trigger),
    };

    return withActiveSpan(
      'kibana.plugin.deferred_init.run',
      { attributes: commonAttrs },
      async () => {
        const runStartNs = process.hrtime.bigint();

        const existing = await readDeferredInitState(savedObjects, logger, pluginId);
        // Only trust a stored `available` result if it was written by the same Kibana version.
        // On upgrade the SO is migrated but attributes persist, so a stale `available` from the
        // previous version must be treated as unknown and the runner re-executed.
        if (existing?.status === 'available' && existing.kibanaVersion === this.kibanaVersion) {
          const durationMs = Number(process.hrtime.bigint() - runStartNs) / 1e6;
          const attrs = { ...commonAttrs, outcome: 'available' };
          inst.durationHistogram.record(durationMs, attrs);
          inst.attemptsCounter.add(1, attrs);
          return 'available' as GuardedRunOutcome;
        }

        try {
          await withLock(
            { esClient: elasticsearch.client, logger, lockId: LOCK_ID_PREFIX + pluginId },
            () => runner(ctx)
          );
        } catch (error) {
          if (isLockAcquisitionError(error)) {
            this.log.debug(
              `Deferred init for "${pluginId}": lock held by another instance; will retry.`
            );
            const durationMs = Number(process.hrtime.bigint() - runStartNs) / 1e6;
            const attrs = { ...commonAttrs, outcome: 'retry' };
            inst.durationHistogram.record(durationMs, attrs);
            inst.attemptsCounter.add(1, attrs);
            return 'retry' as GuardedRunOutcome;
          }

          // The runner threw. Before recording a cluster-wide failure, make sure a peer that
          // raced us to completion didn't already succeed in the meantime.
          const latest = await readDeferredInitState(savedObjects, logger, pluginId);
          if (latest?.status === 'available' && latest.kibanaVersion === this.kibanaVersion) {
            const durationMs = Number(process.hrtime.bigint() - runStartNs) / 1e6;
            const attrs = { ...commonAttrs, outcome: 'available' };
            inst.durationHistogram.record(durationMs, attrs);
            inst.attemptsCounter.add(1, attrs);
            return 'available' as GuardedRunOutcome;
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
          const durationMs = Number(process.hrtime.bigint() - runStartNs) / 1e6;
          const attrs = { ...commonAttrs, outcome: 'failed' };
          inst.durationHistogram.record(durationMs, attrs);
          inst.attemptsCounter.add(1, attrs);
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
        const durationMs = Number(process.hrtime.bigint() - runStartNs) / 1e6;
        const attrs = { ...commonAttrs, outcome: 'available' };
        inst.durationHistogram.record(durationMs, attrs);
        inst.attemptsCounter.add(1, attrs);
        return 'available' as GuardedRunOutcome;
      }
    ) as Promise<GuardedRunOutcome>;
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
