/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { filter, firstValueFrom, fromEvent, map, of, race, take, timer } from 'rxjs';
import type { CoreStatus, Logger } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';

export const DEFAULT_MANAGED_INSTALL_PING_RETRY_INTERVAL_MS = 500;

export type ManagedInstallReadinessReason = 'stopping' | 'timeout' | 'elasticsearch_ping_failed';

export type ManagedInstallReadinessResult =
  | { ready: true }
  | { ready: false; reason: ManagedInstallReadinessReason };

export interface WaitForManagedWorkflowInstallReadinessParams {
  core$: Observable<CoreStatus>;
  /** Live ping — typed loosely so tests can pass a stub without ES client `this` binding. */
  esClient: { ping: () => Promise<unknown> };
  /** Abort when Kibana/plugin is stopping (replaces polling an `isStopping` flag). */
  signal: AbortSignal;
  /**
   * Soft timeout for waiting on Elasticsearch `available`.
   * Default `null` = wait until available or stopping (Task Manager–style).
   * Pass a number only for tests or callers that need a bounded wait.
   */
  timeoutMs?: number | null;
  /** Delay between ping retries when `timeoutMs` is `null`. */
  pingRetryIntervalMs?: number;
  /** Included in progress logs when waiting (e.g. install id / ready()). */
  operation?: string;
  logger: Logger;
}

const whenAborted$ = (signal: AbortSignal): Observable<'stopping'> =>
  signal.aborted
    ? of('stopping' as const)
    : fromEvent(signal, 'abort').pipe(
        take(1),
        map(() => 'stopping' as const)
      );

/**
 * Gate managed install / reconcile / orphan-cleanup ES writes on cluster readiness.
 * Does not wait on Saved Objects or change-history initialization.
 */
export const waitForManagedWorkflowInstallReadiness = async ({
  core$,
  esClient,
  signal,
  timeoutMs = null,
  pingRetryIntervalMs = DEFAULT_MANAGED_INSTALL_PING_RETRY_INTERVAL_MS,
  operation,
  logger,
}: WaitForManagedWorkflowInstallReadinessParams): Promise<ManagedInstallReadinessResult> => {
  if (signal.aborted) {
    return { ready: false, reason: 'stopping' };
  }

  const operationSuffix = operation ? ` before managed ${operation}` : '';

  const initialStatus = await firstValueFrom(core$.pipe(take(1)));
  if (initialStatus.elasticsearch.level !== ServiceStatusLevels.available && !signal.aborted) {
    logger.info(
      `Managed workflow install readiness: waiting for Elasticsearch to become available${operationSuffix}`
    );
  }

  const elasticsearchAvailable$ = core$.pipe(
    map((status) => status.elasticsearch.level === ServiceStatusLevels.available),
    filter((available) => available),
    take(1),
    map(() => 'available' as const)
  );

  const stopping$ = whenAborted$(signal);

  const waitOutcome =
    timeoutMs === null
      ? await firstValueFrom(race([elasticsearchAvailable$, stopping$]))
      : await firstValueFrom(
          race([
            elasticsearchAvailable$,
            timer(timeoutMs).pipe(map(() => 'timeout' as const)),
            stopping$,
          ])
        );

  if (waitOutcome === 'stopping') {
    return { ready: false, reason: 'stopping' };
  }

  if (waitOutcome === 'timeout') {
    return { ready: false, reason: 'timeout' };
  }

  if (signal.aborted) {
    return { ready: false, reason: 'stopping' };
  }

  return pingUntilReady({
    esClient,
    signal,
    timeoutMs,
    pingRetryIntervalMs,
    operationSuffix,
    logger,
  });
};

const pingUntilReady = async ({
  esClient,
  signal,
  timeoutMs,
  pingRetryIntervalMs,
  operationSuffix,
  logger,
}: {
  esClient: { ping: () => Promise<unknown> };
  signal: AbortSignal;
  timeoutMs: number | null;
  pingRetryIntervalMs: number;
  operationSuffix: string;
  logger: Logger;
}): Promise<ManagedInstallReadinessResult> => {
  let loggedPingWait = false;

  while (!signal.aborted) {
    try {
      await esClient.ping();
      if (signal.aborted) {
        return { ready: false, reason: 'stopping' };
      }
      return { ready: true };
    } catch (error) {
      logger.debug(
        `Managed workflow install readiness: Elasticsearch ping failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Soft-timeout callers (tests): one-shot ping.
      if (timeoutMs !== null) {
        return { ready: false, reason: 'elasticsearch_ping_failed' };
      }

      if (!loggedPingWait) {
        loggedPingWait = true;
        logger.info(
          `Managed workflow install readiness: waiting for Elasticsearch ping to succeed${operationSuffix}`
        );
      }

      const retryOutcome = await firstValueFrom(
        race([timer(pingRetryIntervalMs).pipe(map(() => 'retry' as const)), whenAborted$(signal)])
      );

      if (retryOutcome === 'stopping') {
        return { ready: false, reason: 'stopping' };
      }
    }
  }

  return { ready: false, reason: 'stopping' };
};
