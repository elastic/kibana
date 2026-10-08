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
  merge,
  take,
  timer,
  type Observable,
  type Subscription,
} from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Logger } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';
import type { InternalThreadsStart } from '@kbn/core-threads-server-internal';
import { ServiceStatusLevels, type ServiceStatus } from '@kbn/core-status-common';
import { EventLoopWatchdog } from './event_loop_watchdog';
import { RUNNING_FALLBACK_MS, RUNNING_GRACE_MS } from './types';

/** Feature flag enabling the event-loop watchdog (and its profiling session) at runtime. */
export const EVENT_LOOP_WATCHDOG_FEATURE_FLAG = 'core.eventLoopWatchdog.enabled';

export interface EventLoopWatchdogSetupDeps {
  /** Kibana's overall status: startup ends once it is first available. */
  status: { overall$: Observable<ServiceStatus> };
}

export interface EventLoopWatchdogStartDeps {
  threads: InternalThreadsStart;
  featureFlags: FeatureFlagsStart;
}

/**
 * Node's `--diagnostic-dir`, where Serverless collects diagnostic files from (its archive volume).
 * As for Node itself, the last occurrence wins, and command-line flags override `NODE_OPTIONS`:
 * Kibana's start script sets a default early in `NODE_OPTIONS` that the controller overrides.
 */
export const resolveDiagnosticDir = (
  execArgv: readonly string[] = process.execArgv,
  nodeOptions: string = process.env.NODE_OPTIONS ?? ''
): string | undefined =>
  [...nodeOptions.split(/\s+/), ...execArgv]
    .map((arg) => /^--diagnostic-dir=(.+)$/.exec(arg)?.[1])
    .filter(Boolean)
    .pop();

/**
 * Core-owned event-loop watchdog PoC: while the feature flag is on, a worker detects blocks and
 * profiles the main thread (through an inspector session) during egregious blocks.
 * @internal
 */
export class EventLoopWatchdogService {
  private readonly logger: Logger;
  private watchdog?: EventLoopWatchdog;
  private subscription?: Subscription;
  private overall$?: Observable<ServiceStatus>;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('metrics', 'event_loop_watchdog');
  }

  public setup({ status }: EventLoopWatchdogSetupDeps): void {
    this.overall$ = status.overall$;
  }

  public start({ featureFlags, threads }: EventLoopWatchdogStartDeps): void {
    const watchdog = new EventLoopWatchdog({
      threads,
      logger: this.logger,
      sanitizeRoot: REPO_ROOT,
      diagnosticDir: resolveDiagnosticDir(),
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
    // Startup ends once Kibana is first available (plus a grace period to settle), or regardless
    // after a while: blocks after that are written within their own, running budget.
    const available$ = (this.overall$ ?? EMPTY).pipe(
      filter(({ level }) => level === ServiceStatusLevels.available),
      take(1),
      delay(RUNNING_GRACE_MS)
    );
    const running$ = merge(available$, timer(RUNNING_FALLBACK_MS)).pipe(take(1));
    this.subscription.add(running$.subscribe(() => watchdog.markRunning()));
  }

  public async stop(): Promise<void> {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    await this.watchdog?.stop();
  }
}
