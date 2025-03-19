/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import { merge, type Observable, Subject, type Subscription } from 'rxjs';
import { pairwise, takeUntil, map, startWith, bufferTime, filter, concatAll } from 'rxjs';
import { Logger } from '@kbn/logging';
import type { PluginName } from '@kbn/core-base-common';
import { ServiceStatusLevels } from '@kbn/core-status-common';
import type { LoggablePluginStatus, PluginStatus } from './types';

// let plugins log up to 3 status changes every 30s (extra messages will be throttled / aggregated)
const MAX_MESSAGES_PER_PLUGIN_PER_INTERVAL = 3;
const THROTTLE_INTERVAL_MILLIS = 30000;
const MAX_THROTTLED_MESSAGES = 10;

interface LogPluginsStatusChangesParams {
  logger: Logger;
  plugins$: Observable<Record<PluginName, PluginStatus>>;
  stop$: Observable<void>;
  maxMessagesPerPluginPerInterval?: number;
  throttleIntervalMillis?: number;
  maxThrottledMessages?: number;
}

export const logPluginsStatusChanges = ({
  logger,
  plugins$,
  stop$,
  maxMessagesPerPluginPerInterval = MAX_MESSAGES_PER_PLUGIN_PER_INTERVAL,
  throttleIntervalMillis = THROTTLE_INTERVAL_MILLIS,
  maxThrottledMessages = MAX_THROTTLED_MESSAGES,
}: LogPluginsStatusChangesParams): Subscription => {
  const buffer = new Subject<LoggablePluginStatus>();
  const throttled$: Observable<LoggablePluginStatus | string> = buffer.asObservable().pipe(
    takeUntil(stop$),
    bufferTime(maxMessagesPerPluginPerInterval),
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

  const direct$: Observable<LoggablePluginStatus> = plugins$.pipe(
    startWith({}), // consider all plugins unavailable by default
    takeUntil(stop$),
    pairwise(),
    map(([oldStatus, newStatus]) => getPluginUpdates(oldStatus, newStatus)),
    concatAll(),
    filter((pluginStatus: LoggablePluginStatus) => {
      const now = Date.now();
      const pluginQuota = lastMessagesTimestamps[pluginStatus.name] || [];
      lastMessagesTimestamps[pluginStatus.name] = pluginQuota;

      // remove timestamps of messages older than the threshold
      while (pluginQuota.length > 0 && pluginQuota[0] < now - throttleIntervalMillis) {
        pluginQuota.shift();
      }

      if (pluginQuota.length >= maxMessagesPerPluginPerInterval) {
        // we're still over quota, throttle the message
        buffer.next(pluginStatus);
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
      const pluginStatus: LoggablePluginStatus = event;
      const { name } = pluginStatus;
      const pluginLogger = logger.get(name);
      const message = getPluginStatusMessage(pluginStatus);

      switch (pluginStatus.level) {
        case ServiceStatusLevels.available:
          pluginLogger.info(message);
          break;
        case ServiceStatusLevels.degraded:
          pluginLogger.warn(message);
          break;
        default:
          pluginLogger.error(message);
      }
    }
  });
};

const getPluginUpdates = (
  previous: Record<PluginName, PluginStatus>,
  next: Record<PluginName, PluginStatus>
): LoggablePluginStatus[] =>
  Object.entries(next)
    .filter(([name, pluginStatus]) => {
      const currentLevel = pluginStatus.level;
      const previousLevel = previous[name]?.level;
      return pluginStatus.reported && currentLevel !== previousLevel;
    })
    .map(([name, pluginStatus]) => ({ ...pluginStatus, name }));

const getPluginStatusMessage = ({
  name,
  level,
  summary,
  detail,
  repeats = 0,
}: LoggablePluginStatus): string =>
  `${name} plugin is now ${level?.toString()}: ${summary}${detail ? ` | ${detail}` : ''}${
    repeats > 1 ? ` (repeated ${repeats} times)` : ''
  }`;
