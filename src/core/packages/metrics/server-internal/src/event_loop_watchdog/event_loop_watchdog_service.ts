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
  concatMap,
  delay,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  merge,
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
import { resolveWorkerLogging, type LoggingConfigSubset } from './resolve_worker_logging';
import { RUNNING_FALLBACK_MS, RUNNING_GRACE_MS } from './types';

/** Feature flag that turns the event loop watchdog on and off at runtime. */
export const EVENT_LOOP_WATCHDOG_FEATURE_FLAG = 'core.eventLoopWatchdog.enabled';
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
  private subscription?: Subscription;
  private overall$?: Observable<ServiceStatus>;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get(...LOGGER_CONTEXT);
  }

  public async setup({ status, nodeRoles, serviceVersion }: EventLoopWatchdogSetupDeps) {
    this.overall$ = status.overall$;
    const { configService } = this.coreContext;
    const [{ eventLoopWatchdog: config }, loggingConfig] = await Promise.all([
      firstValueFrom(configService.atPath<OpsConfigType>(OPS_CONFIG_PATH)),
      firstValueFrom(configService.atPath<LoggingConfigSubset>('logging')),
    ]);
    const runningThresholdMs = config.blockThreshold.asMilliseconds();
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
            this.logger.warn(`Failed to toggle the event loop watchdog: ${error.message}`);
          }
        })
      )
      .subscribe({
        // Without a handler the error would be thrown on the main thread. A watchdog the flag
        // can no longer turn off is turned off.
        error: (error) => {
          this.logger.error(
            `Stopping the event loop watchdog: its feature flag failed: ${error.message}`
          );
          void watchdog.stop();
        },
      });

    // Startup ends once Kibana is first available plus a grace period, or after a while regardless.
    const available$ = (this.overall$ ?? EMPTY).pipe(
      filter(({ level }) => level === ServiceStatusLevels.available),
      take(1),
      delay(RUNNING_GRACE_MS)
    );
    const running$ = merge(available$, timer(RUNNING_FALLBACK_MS)).pipe(take(1));
    this.subscription.add(
      running$.subscribe({
        next: () => watchdog.markRunning(),
        error: (error) =>
          this.logger.error(`Event loop watchdog can't follow Kibana's status: ${error.message}`),
      })
    );
  }

  public async stop(): Promise<void> {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    await this.watchdog?.stop();
  }
}
