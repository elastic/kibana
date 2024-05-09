/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import { merge, type Observable, Subject, type Subscription } from 'rxjs';
import { pairwise, takeUntil, map, startWith, bufferTime, concatAll, filter } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { type CoreStatus, ServiceStatusLevels } from '@kbn/core-status-common';
import type { LoggableServiceStatus } from './types';

// let services log up to 3 status changes every 30s (extra messages will be throttled / aggregated)
const MAX_MESSAGES_PER_SERVICE_PER_INTERVAL = 3;
const THROTTLE_INTERVAL_MILLIS = 30000;
const MAX_THROTTLED_MESSAGES = 10;

interface LogCoreStatusChangesParams {
  logger: Logger;
  core$: Observable<CoreStatus>;
  stop$: Observable<void>;
  maxMessagesPerServicePerInterval?: number;
  throttleIntervalMillis?: number;
  maxThrottledMessages?: number;
}

export const logCoreStatusChanges = ({
  logger,
  core$,
  stop$,
  maxMessagesPerServicePerInterval = MAX_MESSAGES_PER_SERVICE_PER_INTERVAL,
  throttleIntervalMillis = THROTTLE_INTERVAL_MILLIS,
  maxThrottledMessages = MAX_THROTTLED_MESSAGES,
}: LogCoreStatusChangesParams): Subscription => {
  const buffer = new Subject<LoggableServiceStatus>();
  const throttled$: Observable<LoggableServiceStatus | string> = buffer.asObservable().pipe(
    takeUntil(stop$),
    bufferTime(maxMessagesPerServicePerInterval),
    map((statuses) => {
      const aggregated = // aggregate repeated messages, and count nbr. of repetitions
        statuses.filter((candidateStatus, index) => {
          const firstMessageIndex = statuses.findIndex(
            (status) =>
              candidateStatus.name === status.name &&
              candidateStatus.level === status.level &&
              candidateStatus.summary === status.summary
          );
          if (index !== firstMessageIndex) {
            // this is not the first time this message is logged, increase 'repeats' counter for the first occurrence
            statuses[firstMessageIndex].repeats = (statuses[firstMessageIndex].repeats ?? 1) + 1;
            return false;
          } else {
            // this is the first time this message is logged, let it through
            return true;
          }
        });

      if (aggregated.length > maxThrottledMessages) {
        const list: string = uniq(
          aggregated.slice(maxThrottledMessages).map(({ name }) => name)
        ).join(', ');

        return [
          ...aggregated.slice(0, maxThrottledMessages),
          `${
            aggregated.length - maxThrottledMessages
          } other status updates from [${list}] have been truncated to avoid flooding the logs`,
        ];
      } else {
        return aggregated;
      }
    }),
    concatAll()
  );

  const lastMessagesTimestamps: Record<string, number[]> = {};

  const direct$: Observable<LoggableServiceStatus> = core$.pipe(
    startWith(undefined), // consider all services unavailable by default
    takeUntil(stop$),
    pairwise(),
    map(([previous, current]) => getServiceUpdates({ previous, current: current! })),
    concatAll(),
    filter((serviceStatus: LoggableServiceStatus) => {
      const now = Date.now();
      const pluginQuota = lastMessagesTimestamps[serviceStatus.name] || [];
      lastMessagesTimestamps[serviceStatus.name] = pluginQuota;

      // remove timestamps of messages older than the threshold
      while (pluginQuota.length > 0 && pluginQuota[0] < now - throttleIntervalMillis) {
        pluginQuota.shift();
      }

      if (pluginQuota.length >= maxMessagesPerServicePerInterval) {
        // we're still over quota, throttle the message
        buffer.next(serviceStatus);
        return false;
      } else {
        // let the message pass through
        pluginQuota.push(now);
        return true;
      }
    })
  );

  return merge(direct$, throttled$).subscribe((event) => {
    if (typeof event === 'string') {
      logger.warn(event);
    } else {
      const serviceStatus: LoggableServiceStatus = event;
      const { name } = serviceStatus;
      const serviceLogger = logger.get(name);
      const message = getServiceStatusMessage(serviceStatus);

      switch (serviceStatus.level) {
        case ServiceStatusLevels.available:
          serviceLogger.info(message);
          break;
        case ServiceStatusLevels.degraded:
          serviceLogger.warn(message);
          break;
        default:
          serviceLogger.error(message);
      }
    }
  });
};

const getServiceUpdates = ({
  current,
  previous,
}: {
  current: CoreStatus;
  previous?: CoreStatus;
}): LoggableServiceStatus[] => {
  let name: keyof CoreStatus;
  const updated: LoggableServiceStatus[] = [];

  for (name in current) {
    if (Object.hasOwn(current, name)) {
      const currentLevel = current[name].level;
      const previousLevel = previous?.[name].level;

      if (currentLevel !== previousLevel) {
        updated.push({ ...current[name], name });
      }
    }
  }
  return updated;
};

const getServiceStatusMessage = ({
  name,
  level,
  summary,
  detail,
  repeats = 0,
}: LoggableServiceStatus): string =>
  `${name} service is now ${level?.toString()}: ${summary}${detail ? ` | ${detail}` : ''}${
    repeats > 1 ? ` (repeated ${repeats} times)` : ''
  }`;
