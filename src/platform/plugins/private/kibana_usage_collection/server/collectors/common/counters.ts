/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { Logger } from '@kbn/logging';
import {
  CollectorFetchContext,
  UsageCountersSavedObject,
  UsageCountersSavedObjectAttributes,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '@kbn/usage-collection-plugin/server';

export interface CounterEvent {
  domainId: string;
  counterName: string;
  counterType: string;
  lastUpdatedAt: string;
  fromTimestamp: string;
  total: number;
}

export function createCounterFetcher<T>(
  logger: Logger,
  filter: string,
  transform: (counters: CounterEvent[]) => T
) {
  return async ({ soClient }: Pick<CollectorFetchContext, 'soClient'>) => {
    const finder = soClient.createPointInTimeFinder<UsageCountersSavedObjectAttributes>({
      type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      namespaces: ['*'],
      fields: ['count', 'counterName', 'counterType', 'domainId'],
      filter,
      perPage: 100,
    });

    const dailyEvents: CounterEvent[] = [];

    for await (const { saved_objects: rawUsageCounters } of finder.find()) {
      rawUsageCounters.forEach((raw) => {
        try {
          const event = transformRawCounter(raw);
          if (event) {
            dailyEvents.push(event);
          }
        } catch (err) {
          // swallow error; allows sending successfully transformed objects.
          logger.debug('Error collecting usage-counter details: ' + err.message);
        }
      });
    }

    return transform(mergeCounters(dailyEvents));
  };
}

export function transformRawCounter(
  rawCounter: UsageCountersSavedObject
): CounterEvent | undefined {
  const {
    attributes: { domainId, counterType, counterName, count },
    updated_at: lastUpdatedAt,
  } = rawCounter;

  if (typeof count !== 'number' || count < 1) {
    return;
  }

  const fromTimestamp = moment(lastUpdatedAt).utc().startOf('day').format();

  return {
    domainId,
    counterType,
    counterName,
    lastUpdatedAt: lastUpdatedAt!,
    fromTimestamp,
    total: count,
  };
}

function mergeCounters(counters: CounterEvent[]): CounterEvent[] {
  const mergedCounters = counters.reduce((acc, counter) => {
    const { domainId, counterType, counterName, fromTimestamp } = counter;
    const key = `${domainId}:${counterType}:${counterName}:${fromTimestamp}`;

    const existingCounter = acc[key];
    if (!existingCounter) {
      acc[key] = counter;
      return acc;
    } else {
      acc[key].total = existingCounter.total + counter.total;
      acc[key].lastUpdatedAt = counter.lastUpdatedAt;
    }
    return acc;
  }, {} as Record<string, CounterEvent>);

  return Object.values(mergedCounters);
}
