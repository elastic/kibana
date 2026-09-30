/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { concatMap, distinctUntilChanged, firstValueFrom, type Subscription } from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Logger, LogLevelId } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';
import type { InternalThreadsStart, WorkerLoggingConfig } from '@kbn/core-threads-server-internal';
import { OPS_CONFIG_PATH, type OpsConfigType } from '../ops_config';
import { ActivityRegistry } from './activity_registry';
import { EventLoopWatchdog } from './event_loop_watchdog';
import type { WatchdogOptions } from './types';

/** Feature flag enabling the event-loop watchdog at runtime. */
export const EVENT_LOOP_WATCHDOG_FEATURE_FLAG = 'core.eventLoopWatchdog.enabled';
const PROFILE_SAMPLING_INTERVAL_US = 1_000;
const MAX_FRAMES = 5;
const LOGGER_CONTEXT = ['metrics', 'event_loop_watchdog'] as const;

export interface EventLoopWatchdogSetupDeps {
  executionContext: InternalExecutionContextSetup;
}

export interface EventLoopWatchdogStartDeps {
  threads: InternalThreadsStart;
  featureFlags: FeatureFlagsStart;
}

interface LoggerConfigSubset {
  name?: string;
  appenders?: string[];
  level?: LogLevelId;
}

interface LoggingConfigSubset {
  appenders?: Map<string, { type?: string; layout?: { type?: string } }>;
  loggers?: LoggerConfigSubset[];
  root?: LoggerConfigSubset;
}

const ROOT_LOGGER = 'root';
const BUILT_IN_CONSOLE_APPENDERS = new Set(['default', 'console']);
/** Snapshots the logger's level and console format for independent worker diagnostics. */
export const resolveWorkerLogging = (
  { appenders, loggers = [], root }: LoggingConfigSubset,
  loggerName: string
): WorkerLoggingConfig => {
  const byName = new Map<string, LoggerConfigSubset>([
    [ROOT_LOGGER, { appenders: ['default'], level: 'info', ...root }],
    ...loggers.map((logger): [string, LoggerConfigSubset] => [logger.name ?? '', logger]),
  ]);
  const chain = loggerName
    .split('.')
    .map((_, index, parts) => parts.slice(0, parts.length - index).join('.'))
    .concat(ROOT_LOGGER)
    .flatMap((name) => {
      const config = byName.get(name);
      return config ? [config] : [];
    });

  const level = chain.find((config) => config.level)?.level ?? 'info';

  const effectiveAppenders =
    chain.find((config) => (config.appenders ?? []).length > 0)?.appenders ?? [];
  const consoleLayouts = effectiveAppenders.flatMap((name) => {
    const appender = appenders?.get(name);
    if (appender) return appender.type === 'console' ? [appender.layout?.type] : [];
    return BUILT_IN_CONSOLE_APPENDERS.has(name) ? ['pattern'] : [];
  });
  return {
    context: loggerName,
    level,
    format:
      consoleLayouts.length === 0 ? undefined : consoleLayouts.includes('json') ? 'json' : 'text',
  };
};

export const toWatchdogOptions = ({
  eventLoopWatchdog: config,
}: Pick<OpsConfigType, 'eventLoopWatchdog'>): WatchdogOptions => {
  const heartbeatIntervalMs = config.heartbeatInterval.asMilliseconds();
  const thresholdMs = Math.max(config.threshold.asMilliseconds(), heartbeatIntervalMs * 2);
  const maxProfileDurationMs = config.maxProfileDuration.asMilliseconds();
  return {
    thresholdMs,
    heartbeatIntervalMs,
    // the poll loop also enforces the profile deadline, so it must not be coarser than it
    pollIntervalMs: Math.max(
      5,
      Math.floor(Math.min(heartbeatIntervalMs, maxProfileDurationMs) / 2)
    ),
    liveNoticeIntervalMs: config.liveNoticeInterval.asMilliseconds(),
    maxLiveNoticesPerBlock: config.maxLiveNoticesPerBlock,
    maxCandidates: config.maxCandidates,
    profileAfterMs: Math.max(config.profileAfter.asMilliseconds(), thresholdMs),
    maxProfileDurationMs,
    profileCooldownMs: config.profileCooldown.asMilliseconds(),
    profileSamplingIntervalUs: PROFILE_SAMPLING_INTERVAL_US,
    maxFrames: MAX_FRAMES,
  };
};

/**
 * Core-owned event-loop watchdog: tracks candidate activities from execution contexts at all
 * times and runs the watchdog worker while the feature flag is enabled.
 * @internal
 */
export class EventLoopWatchdogService {
  private readonly logger: Logger;
  private readonly registry = new ActivityRegistry();
  private watchdog?: EventLoopWatchdog;
  private subscription?: Subscription;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get(...LOGGER_CONTEXT);
  }

  public setup({ executionContext }: EventLoopWatchdogSetupDeps): void {
    executionContext.registerActivityObserver(this.registry.observe);
  }

  public async start({ featureFlags, threads }: EventLoopWatchdogStartDeps): Promise<void> {
    const { configService } = this.coreContext;
    const [opsConfig, loggingConfig] = await Promise.all([
      firstValueFrom(configService.atPath<OpsConfigType>(OPS_CONFIG_PATH)),
      firstValueFrom(configService.atPath<LoggingConfigSubset>('logging')),
    ]);

    const watchdog = new EventLoopWatchdog({
      threads,
      logger: this.logger,
      logging: resolveWorkerLogging(loggingConfig, LOGGER_CONTEXT.join('.')),
      options: toWatchdogOptions(opsConfig),
      registry: this.registry,
      sanitizeRoot: REPO_ROOT,
    });
    this.watchdog = watchdog;

    this.subscription = featureFlags
      .getBooleanValue$(EVENT_LOOP_WATCHDOG_FEATURE_FLAG, false)
      .pipe(
        distinctUntilChanged(),
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
      .subscribe();
  }

  public async stop(): Promise<void> {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    await this.watchdog?.stop();
  }
}
