/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EMPTY,
  catchError,
  combineLatest,
  concatMap,
  delay,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  merge,
  skipWhile,
  take,
  timer,
  type Observable,
  type Subscription,
} from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';
import { ServiceStatusLevels, type ServiceStatus } from '@kbn/core-status-common';
import { OPS_CONFIG_PATH, type OpsConfigType } from '../ops_config';
import { EventLoopWatchdog } from './event_loop_watchdog';
import { resolveDiagnosticDir } from './resolve_diagnostic_dir';
import { resolveWorkerLogging, type LoggingConfigSubset } from './resolve_worker_logging';
import { RUNNING_FALLBACK_MS, RUNNING_GRACE_MS } from './constants';

/** Feature flag that turns the event loop watchdog on and off at runtime. */
export const EVENT_LOOP_WATCHDOG_FEATURE_FLAG = 'core.eventLoopWatchdog.enabled';
/** Per-role CPU profiling flags. */
export const EVENT_LOOP_WATCHDOG_PROFILING_FEATURE_FLAGS = {
  background_tasks: 'core.eventLoopWatchdog.profiling.backgroundTasks.enabled',
  ui: 'core.eventLoopWatchdog.profiling.ui.enabled',
} as const satisfies Record<'background_tasks' | 'ui', string>;
const LOGGER_CONTEXT = ['metrics', 'event_loop_watchdog'] as const;

export interface EventLoopWatchdogSetupDeps {
  /** Kibana's overall status: startup ends once it is first available. */
  status: { overall$: Observable<ServiceStatus> };
  /** Node role names, as main-thread log lines carry them in `service.node.roles`. */
  nodeRoles: readonly string[];
  /** Same value as main-thread log lines carry in `service.version`. */
  serviceVersion: string;
}

export interface EventLoopWatchdogStartDeps {
  featureFlags: Pick<FeatureFlagsStart, 'getBooleanValue$'>;
}

/**
 * Detects main-thread event loop blocks from a worker thread while the feature flag is on.
 * @internal
 */
export class EventLoopWatchdogService {
  private readonly logger: Logger;
  private watchdog?: EventLoopWatchdog;
  private enabledFallback = false;
  private nodeRoles: readonly string[] = [];
  private subscription?: Subscription;
  private overall$?: Observable<ServiceStatus>;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get(...LOGGER_CONTEXT);
  }

  public async setup({ status, nodeRoles, serviceVersion }: EventLoopWatchdogSetupDeps) {
    this.overall$ = status.overall$;
    this.nodeRoles = nodeRoles;
    const { configService } = this.coreContext;
    const [{ eventLoopWatchdog: config }, loggingConfig] = await Promise.all([
      firstValueFrom(configService.atPath<OpsConfigType>(OPS_CONFIG_PATH)),
      firstValueFrom(configService.atPath<LoggingConfigSubset>('logging')),
    ]);
    const runningThresholdMs = config.blockThreshold.asMilliseconds();
    const { profiling, startup } = config;
    const perPhaseMs = (key: keyof typeof profiling) => ({
      starting: (startup.profiling[key] ?? profiling[key]).asMilliseconds(),
      running: profiling[key].asMilliseconds(),
    });
    this.enabledFallback = config.enabled;
    this.watchdog = new EventLoopWatchdog({
      logger: this.logger,
      thresholdsMs: {
        starting: config.startup.blockThreshold?.asMilliseconds() ?? runningThresholdMs,
        running: runningThresholdMs,
      },
      statsIntervalMs: config.statsInterval.asMilliseconds(),
      logging: resolveWorkerLogging(loggingConfig, LOGGER_CONTEXT.join('.'), {
        nodeRoles,
        version: serviceVersion,
      }),
      profiling: {
        startAfterMs: perPhaseMs('startAfter'),
        maxDurationMs: perPhaseMs('maxDuration'),
        cooldownMs: perPhaseMs('cooldown'),
        diagnosticDir: resolveDiagnosticDir(),
      },
    });
  }

  public start({ featureFlags }: EventLoopWatchdogStartDeps): void {
    const { watchdog } = this;
    if (!watchdog) {
      throw new Error('EventLoopWatchdogService#setup() must be called before #start()');
    }
    // `enabled` is the flag's fallback: it applies where no provider or override sets the flag.
    this.subscription = featureFlags
      .getBooleanValue$(EVENT_LOOP_WATCHDOG_FEATURE_FLAG, this.enabledFallback)
      .pipe(
        distinctUntilChanged(),
        // One toggle at a time: the watchdog can't start while it's still stopping.
        concatMap(async (enabled) => {
          try {
            if (enabled) {
              watchdog.start();
            } else {
              await watchdog.stop();
            }
          } catch (error) {
            this.logFailure('warn', 'Failed to toggle the event loop watchdog', error);
          }
        })
      )
      .subscribe({
        // Without a handler the error would be thrown on the main thread. A watchdog the flag
        // can no longer turn off is turned off.
        error: (error) => {
          this.logFailure(
            'error',
            'Stopping the event loop watchdog: its feature flag failed',
            error
          );
          void watchdog.stop();
        },
      });

    this.subscription.add(this.followProfilingFlags(featureFlags));

    // Startup ends once Kibana is first available plus a grace period, or after a while regardless.
    const available$ = (this.overall$ ?? EMPTY).pipe(
      filter(({ level }) => level === ServiceStatusLevels.available),
      take(1),
      delay(RUNNING_GRACE_MS),
      // Caught here, so a status error can't cancel the fallback timer below.
      catchError((error) => {
        this.logFailure('error', "Event loop watchdog can't follow Kibana's status", error);
        return EMPTY;
      })
    );
    const running$ = merge(available$, timer(RUNNING_FALLBACK_MS)).pipe(take(1));
    this.subscription.add(running$.subscribe(() => watchdog.markRunning()));
  }

  public async stop(): Promise<void> {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    await this.watchdog?.stop();
  }

  /** Role-specific profiling flags default to off. */
  private followProfilingFlags(
    featureFlags: EventLoopWatchdogStartDeps['featureFlags']
  ): Subscription {
    const flags$ = Object.entries(EVENT_LOOP_WATCHDOG_PROFILING_FEATURE_FLAGS)
      .filter(([role]) => this.nodeRoles.includes(role))
      .map(([, flag]) => featureFlags.getBooleanValue$(flag, false));
    return combineLatest(flags$)
      .pipe(
        map((values) => values.some(Boolean)),
        distinctUntilChanged(),
        // Nodes whose profiling flags have never been on log nothing.
        skipWhile((enabled) => !enabled)
      )
      .subscribe({
        next: (enabled) => {
          // Temporary: replaced by the profiling log line once enabled in the worker itself
          this.logger.info(
            `Event loop watchdog profiling flag ${enabled ? 'on' : 'off'} for this node`
          );
        },
        error: (error) => {
          this.logFailure(
            'error',
            'Event loop watchdog profiling flag failed, treating it as off',
            error
          );
        },
      });
  }

  private logFailure(level: 'warn' | 'error', message: string, error: Error): void {
    this.logger[level](`${message}: ${error.message}`);
    if (error.stack) {
      this.logger.debug(`${message}: ${error.stack}`);
    }
  }
}
