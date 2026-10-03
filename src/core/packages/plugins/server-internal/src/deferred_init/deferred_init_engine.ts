/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import { withTimeout } from '@kbn/std';
import { metrics, ValueType, type Counter, type Histogram } from '@opentelemetry/api';
import type { Logger } from '@kbn/logging';
import { DeferredInitializationError } from '@kbn/core-deferred-init-common';
import type { DeferredInitPhase } from '@kbn/core-deferred-init-common';
import type { InitState } from '@kbn/core-plugins-server';
import { withActiveSpan } from '@kbn/tracing-utils';
import {
  DEFERRED_INIT_BACKOFF_BASE_MS,
  DEFERRED_INIT_BACKOFF_FACTOR,
  DEFERRED_INIT_BACKOFF_MAX_MS,
  DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS,
  DEFERRED_START_TIMEOUT_MS,
} from './backoff';

/**
 * The two deferred phases core runs, in order, on a lazy plugin's first trigger. Both closures
 * are bound by `PluginsSystem` to the plugin's start context and injected dependency contracts.
 */
export interface DeferredInitRunner {
  /** The plugin's `lazyInitialize(core, plugins)`: retriable, idempotent Elasticsearch-side work. */
  lazyInitialize(): Promise<void>;
  /**
   * The plugin's `start(core, plugins)`, followed by publishing its contract to the runtime
   * contract resolver. Only ever invoked after `lazyInitialize` has succeeded on this instance.
   */
  start(): Promise<void>;
}

/** Details of a lazy plugin's most recent failed attempt, as surfaced to the status route. */
export interface DeferredInitFailureDetails {
  message: string;
  /** Consecutive failed attempts since the last success. */
  attempts: number;
  /** Which deferred phase the last attempt failed in. */
  phase: DeferredInitPhase;
}

/**
 * What caused a plugin's deferred init to be kicked for the first time on this process.
 * Recorded as span attributes and metric dimensions so teams can answer "which route/plugin
 * first woke up our plugin in production".
 *
 * @internal
 */
export type InitTrigger =
  | { readonly type: 'http_route'; readonly path: string }
  | { readonly type: 'contract'; readonly callerPlugin: string }
  | { readonly type: 'explicit' };

type PluginSource = 'oss' | 'x-pack' | 'external';

interface DeferredInitRecord {
  readonly state$: BehaviorSubject<InitState>;
  runner?: DeferredInitRunner;
  inFlight?: Promise<void>;
  /**
   * `lazyInitialize` has succeeded on this instance. Sticky: a later `start()` failure re-runs
   * `start()` alone, since the initialization work is idempotent by contract but `start()` is
   * not expected to be, and re-running init would waste the very work that was deferred.
   */
  initialized: boolean;
  lastError?: unknown;
  lastFailedPhase?: DeferredInitPhase;
  /** Consecutive failed attempts since the last success; reset to 0 on success. */
  failedAttempts: number;
  /**
   * Resolves when the current cooldown ends (and `kick()` has been invoked). Present only while
   * a background retry is scheduled; {@link waitUntilAvailable} awaits this instead of kicking
   * immediately so callers honor the backoff.
   */
  cooldownPromise?: Promise<void>;
  /** Set on the first kick; not updated on subsequent retries. */
  firstTrigger?: InitTrigger;
  /** process.hrtime.bigint() captured when the plugin first transitions to 'initializing'. */
  initStartedAtNs?: bigint;
  /** Where the plugin lives in the repo; attached at {@link DeferredInitEngine.register}. */
  source?: PluginSource;
}

const METER_NAME = 'kibana.plugins';

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
          'Wall-clock duration of a single deferred-init attempt (lazyInitialize + start).',
        unit: 'ms',
        valueType: ValueType.DOUBLE,
      }),
      attemptsCounter: meter.createCounter('kibana.plugin.deferred_init.attempts_total', {
        description: 'Cumulative count of deferred-init run attempts, broken down by outcome.',
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

const metricAttributes = (
  pluginId: string,
  record: DeferredInitRecord
): Record<string, string> => ({
  'plugin.id': pluginId,
  'plugin.source': record.source ?? 'external',
  ...triggerAttributes(record.firstTrigger),
});

/**
 * Per-instance engine that tracks each lazy plugin's state and runs its deferred phases on
 * demand. Nothing executes at construction or boot: `lazyInitialize()` and then `start()` run
 * only when {@link DeferredInitEngine.ensureInitialized} or
 * {@link DeferredInitEngine.waitUntilAvailable} is called, which happens on the first gated
 * request, the first status poll, a dependent's `loadPluginContract`, or the plugin's own explicit
 * `trigger()`; never during the boot loop.
 *
 * State is per Kibana instance and in memory only, exactly like the `/status` entry of any
 * non-lazy plugin: nothing is persisted, and no cross-instance lock or shared document is
 * involved. Every instance behind a load balancer therefore runs each lazy plugin's phases once,
 * on its own first trigger. That is deliberate: `lazyInitialize` routinely has to establish
 * *instance-local* preconditions (downloading a browser binary, warming an in-process cache,
 * populating module-scoped state) which a run on some other instance cannot satisfy, and `start()`
 * must produce a contract object that lives in this process. The cost is that `lazyInitialize`
 * may run once per instance rather than once per deployment, so it must be safe to execute
 * concurrently on several instances against the same Elasticsearch cluster.
 *
 * Within a single instance, concurrent triggers for the same plugin id share one in-flight
 * promise (`record.inFlight`), so a burst of requests produces exactly one attempt. A `failed`
 * attempt becomes retriable again after a jittered, exponentially-backed-off cooldown (see
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
   * deferred phases during boot would stall the loop past its watchdog and defeat the whole point
   * of deferring the work.
   */
  private startCycleActive = false;
  /** Captured at construction (early in server boot) for time-to-available measurements. */
  private readonly engineStartedAtNs = process.hrtime.bigint();

  constructor(private readonly log: Logger) {}

  /**
   * Mark the standard `start()` loop as in progress. Called by
   * {@link PluginsSystem.startPlugins} before the loop begins; every path that would block on a
   * lazy plugin ({@link waitUntilAvailable}, and therefore `loadPluginContract` / `trigger`)
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
  public register(pluginId: string, source?: PluginSource): void {
    const record = this.ensureRecord(pluginId);
    if (source) {
      record.source = source;
    }
  }

  /**
   * Attach the deferred phases to a previously-registered plugin id. Called from the boot-time
   * start loop, in place of running the plugin's `start()`. Does NOT run anything.
   */
  public setRunner(pluginId: string, runner: DeferredInitRunner): void {
    this.ensureRecord(pluginId).runner = runner;
  }

  /**
   * Whether a plugin id opted into lazy initialization (i.e. {@link register} was called for it
   * during setup). {@link ensureRecord} would otherwise happily create an `idle` record for any
   * unknown plugin id.
   */
  public isRegistered(pluginId: string): boolean {
    return this.records.has(pluginId);
  }

  /** Current state for a plugin id (`idle` if unknown). Does not trigger anything. */
  public getState(pluginId: string): InitState {
    return this.records.get(pluginId)?.state$.value ?? 'idle';
  }

  /**
   * Details about a plugin's most recent failed attempt, or `undefined` unless it is currently
   * `failed`. Backs the status endpoint the initializing UI reads to show which plugin failed,
   * in which phase, why, and how many consecutive attempts have failed.
   */
  public getFailureDetails(pluginId: string): DeferredInitFailureDetails | undefined {
    const record = this.records.get(pluginId);
    if (!record || record.state$.value !== 'failed') {
      return undefined;
    }
    return {
      message:
        record.lastError instanceof Error ? record.lastError.message : String(record.lastError),
      attempts: record.failedAttempts,
      phase: record.lastFailedPhase ?? 'lazyInitialize',
    };
  }

  /** Observable of a plugin id's state. Registers the id if not yet known. Never triggers. */
  public state$(pluginId: string): Observable<InitState> {
    return this.ensureRecord(pluginId).state$.asObservable();
  }

  /**
   * Kick the deferred phases if the plugin is `idle`, then return the current state immediately.
   * Never awaits completion: the first gated request therefore observes `initializing` (not a
   * hung connection).
   *
   * During the first {@link DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS} failures the background
   * cooldown timer re-kicks the plugin automatically (see {@link scheduleCooldown}), so
   * `ensureInitialized` deliberately does NOT re-kick a `failed` plugin: both the initializing-UI
   * poll (`GET /internal/core/deferred_init/{pluginId}`) and every gated route call this on each
   * hit, so kicking on every `failed` hit would immediately flip the state to `initializing`
   * before the caller ever observes the failure, silently defeating the backoff. This is not
   * Kibana's `/status` readiness/liveness probe, which is read-only via {@link state$}.
   *
   * Once background retries are exhausted the cooldown timer stops firing. At that point
   * `ensureInitialized` switches to on-demand recovery: a `failed` plugin is re-kicked on the
   * next incoming gated request, so any API hit or UI poll can trigger a fresh attempt without
   * requiring a Kibana restart.
   */
  public ensureInitialized(pluginId: string, trigger?: InitTrigger): InitState {
    const record = this.records.get(pluginId);
    if (!record) {
      return 'idle';
    }
    const { value: state } = record.state$;
    if (
      state === 'idle' ||
      (state === 'failed' && record.failedAttempts >= DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS)
    ) {
      this.kick(pluginId, record, trigger);
    }
    return record.state$.value;
  }

  /**
   * Wait until a plugin is `available`, kicking (or re-kicking) its deferred phases as needed.
   * Rejects with a `DeferredInitializationError` if the attempt fails. This is the one path that
   * both triggers and waits; it backs `loadPluginContract` for dependents and `lazyInit.trigger()`
   * for the plugin itself. Everything else (`getStartServices`, `status$`, `onLazyStartService`)
   * only waits.
   */
  public async waitUntilAvailable(pluginId: string, trigger?: InitTrigger): Promise<void> {
    // Guard against being awaited during the plugin `start()` loop. Blocking here would hold the
    // boot loop until this plugin's (deliberately expensive) deferred phases finished, tripping
    // the per-plugin start watchdog and defeating lazy initialization. This is the enforcement
    // point for both cross-plugin `loadPluginContract` and a plugin's own `trigger()`.
    if (this.startCycleActive) {
      throw new Error(
        `Cannot wait for lazy plugin "${pluginId}" during the plugin start lifecycle: doing so ` +
          `blocks boot and defeats lazy initialization. Move this loadPluginContract()/trigger() ` +
          `call into a route handler, a task runner, your own lazyInitialize(), or a function ` +
          `returned from start() that is invoked post-boot.`
      );
    }

    const record = this.ensureRecord(pluginId);
    const state = record.state$.value;

    if (state === 'available') {
      return;
    }
    if (!record.runner) {
      // A misconfiguration (the boot loop never attached a runner), not a transient failure of
      // the plugin itself. Retrying won't make a runner appear, so callers shouldn't spend their
      // retry budget on it.
      throw new DeferredInitializationError(pluginId, {
        message: `Lazy plugin "${pluginId}" has no runner attached.`,
        retriable: false,
        status: state,
      });
    }
    if (record.inFlight) {
      await record.inFlight;
    } else if (record.cooldownPromise) {
      // Honor the backoff: wait for the scheduled retry rather than kicking immediately.
      await record.cooldownPromise;
      if (record.inFlight) {
        await record.inFlight;
      }
    } else if (state === 'idle' || state === 'failed') {
      this.kick(pluginId, record, trigger);
      await (record.inFlight ?? Promise.resolve());
    }

    // Annotated rather than inferred: TypeScript would otherwise carry the pre-`await` narrowing
    // of `state` through to here, even though the attempt we just awaited is what changed it.
    const settled: InitState = record.state$.value;
    if (settled === 'available') {
      return;
    }
    throw new DeferredInitializationError(pluginId, {
      cause: record.lastError,
      status: settled,
    });
  }

  private kick(pluginId: string, record: DeferredInitRecord, trigger?: InitTrigger): void {
    if (record.inFlight) {
      return;
    }
    const { runner } = record;
    if (!runner) {
      this.log.warn(
        `Lazy plugin "${pluginId}" was triggered before its runner was registered; staying idle.`
      );
      return;
    }

    if (!record.firstTrigger && trigger) {
      record.firstTrigger = trigger;
    }

    record.state$.next('initializing');
    record.initStartedAtNs = process.hrtime.bigint();
    this.log.info(
      record.initialized
        ? `Lazy plugin "${pluginId}": re-running start() after a failed attempt.`
        : `Lazy plugin "${pluginId}": running lazyInitialize() and start().`
    );

    let phase: DeferredInitPhase = 'lazyInitialize';
    record.inFlight = this.runPhases(pluginId, record, runner, (current) => {
      phase = current;
    }).then(
      () => {
        record.inFlight = undefined;
        record.failedAttempts = 0;
        record.lastFailedPhase = undefined;
        record.state$.next('available');
        const inst = getInstruments();
        inst.timeToAvailableHistogram.record(
          Number(process.hrtime.bigint() - this.engineStartedAtNs) / 1e6,
          { ...metricAttributes(pluginId, record), outcome: 'available' }
        );
        this.log.info(`Lazy plugin "${pluginId}" is available; routes are now served.`);
      },
      (error: unknown) => {
        record.inFlight = undefined;
        record.lastError = error;
        record.lastFailedPhase = phase;
        record.failedAttempts += 1;
        record.state$.next('failed');
        const message = error instanceof Error ? error.message : String(error);
        this.log.error(`Lazy plugin "${pluginId}" failed during ${phase}(): ${message}`);
        this.scheduleCooldown(pluginId, record);
      }
    );
  }

  /**
   * One attempt: `lazyInitialize()` unless it already succeeded here, then `start()` under
   * {@link DEFERRED_START_TIMEOUT_MS}. `onPhase` lets the caller attribute a rejection to the
   * phase that produced it.
   */
  private async runPhases(
    pluginId: string,
    record: DeferredInitRecord,
    runner: DeferredInitRunner,
    onPhase: (phase: DeferredInitPhase) => void
  ): Promise<void> {
    const inst = getInstruments();
    const commonAttrs = metricAttributes(pluginId, record);
    const startedAtNs = process.hrtime.bigint();
    let outcome: 'available' | 'failed' = 'failed';

    try {
      await withActiveSpan(
        'kibana.plugin.deferred_init',
        { attributes: commonAttrs },
        async (span) => {
          try {
            if (!record.initialized) {
              onPhase('lazyInitialize');
              await runner.lazyInitialize();
              record.initialized = true;
            }

            onPhase('start');
            // `withTimeout` is Promise.race: it does not cancel `runner.start()`. A timeout only
            // fails this engine attempt; the plugin's start() keeps running until it settles.
            const result = await withTimeout({
              promise: runner.start(),
              timeoutMs: DEFERRED_START_TIMEOUT_MS,
            });
            if (result.timedout) {
              throw new Error(
                `Start lifecycle of lazy plugin "${pluginId}" wasn't completed in ` +
                  `${DEFERRED_START_TIMEOUT_MS / 1000}sec.`
              );
            }
            span?.setAttribute('outcome', 'available');
          } catch (error) {
            span?.setAttribute('outcome', 'failed');
            throw error;
          }
        }
      );
      outcome = 'available';
    } finally {
      inst.durationHistogram.record(Number(process.hrtime.bigint() - startedAtNs) / 1e6, {
        ...commonAttrs,
        outcome,
      });
      inst.attemptsCounter.add(1, { ...commonAttrs, outcome });
    }
  }

  /**
   * Jittered, exponentially-backed-off cooldown before a failed plugin is re-kicked. Full jitter,
   * rather than a fixed delay, so a set of instances that all failed against the same unhealthy
   * Elasticsearch cluster don't retry in lockstep, mirroring Fleet's `backOff({ jitter: 'full' })`
   * rationale.
   *
   * The timer itself calls `kick()`: there is no idle gap for a poll to have to notice and
   * re-trigger. {@link waitUntilAvailable} awaits the same cooldown instead of kicking immediately,
   * so a dependent that blocks on the contract still honors the backoff.
   *
   * Once {@link DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS} consecutive failures have accumulated, no
   * further timer is scheduled: the plugin stays `failed` and relies on on-demand kicks from
   * incoming gated requests (see {@link ensureInitialized}) rather than unsolicited background
   * retries.
   */
  private scheduleCooldown(pluginId: string, record: DeferredInitRecord): void {
    if (record.failedAttempts >= DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS) {
      // Background retries exhausted. On-demand recovery takes over: the next gated request,
      // loadPluginContract or trigger() call will re-kick via ensureInitialized/waitUntilAvailable.
      return;
    }

    const upperBoundMs = Math.min(
      DEFERRED_INIT_BACKOFF_BASE_MS * DEFERRED_INIT_BACKOFF_FACTOR ** (record.failedAttempts - 1),
      DEFERRED_INIT_BACKOFF_MAX_MS
    );
    const delayMs = Math.random() * upperBoundMs;

    record.cooldownPromise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        record.cooldownPromise = undefined;
        if (record.state$.value === 'failed') {
          this.kick(pluginId, record);
        }
        resolve();
      }, delayMs);
      // Node-only API; guard for environments/tests where timers are mocked without `unref`.
      timer.unref?.();
    });
  }

  private ensureRecord(pluginId: string): DeferredInitRecord {
    let record = this.records.get(pluginId);
    if (!record) {
      record = {
        state$: new BehaviorSubject<InitState>('idle'),
        initialized: false,
        failedAttempts: 0,
      };
      this.records.set(pluginId, record);
    }
    return record;
  }
}
