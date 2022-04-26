/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import {
  CollectorFetchContext,
  UsageCollectionSetup,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
  UsageCountersSavedObject,
  UsageCountersSavedObjectAttributes,
} from '@kbn/usage-collection-plugin/server';

interface UsageCounterEvent {
  domainId: string;
  counterName: string;
  counterType: string;
  lastUpdatedAt?: string;
  fromTimestamp?: string;
  total: number;
}

export interface UiCountersUsage {
  dailyEvents: UsageCounterEvent[];
}

export function transformRawCounter(
  rawUsageCounter: UsageCountersSavedObject
): UsageCounterEvent | undefined {
  const {
    attributes: { count, counterName, counterType, domainId },
    updated_at: lastUpdatedAt,
  } = rawUsageCounter;
  const fromTimestamp = moment(lastUpdatedAt).utc().startOf('day').format();

  if (domainId === 'uiCounter' || typeof count !== 'number' || count < 1) {
    return;
  }

  return {
    domainId,
    counterName,
    counterType,
    lastUpdatedAt,
    fromTimestamp,
    total: count,
  };
}

export function registerUsageCountersUsageCollector(usageCollection: UsageCollectionSetup) {
  const collector = usageCollection.makeUsageCollector<UiCountersUsage>({
    type: 'usage_counters',
    schema: {
      dailyEvents: {
        type: 'array',
        items: {
          domainId: {
            type: 'keyword',
            _meta: { description: 'Domain name of the metric (ie plugin name).' },
          },
          counterName: {
            type: 'keyword',
            _meta: { description: 'Name of the counter that happened.' },
          },
          lastUpdatedAt: {
            type: 'date',
            _meta: { description: 'Time at which the metric was last updated.' },
          },
          fromTimestamp: {
            type: 'date',
            _meta: { description: 'Time at which the metric was captured.' },
          },
          counterType: {
            type: 'keyword',
            _meta: { description: 'The type of counter used.' },
          },
          total: {
            type: 'integer',
            _meta: { description: 'The total number of times the event happened.' },
          },
        },
      },
    },
    fetch: async ({ soClient }: CollectorFetchContext) => {
      const { saved_objects: rawUsageCounters } =
        await soClient.find<UsageCountersSavedObjectAttributes>({
          type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
          fields: ['count', 'counterName', 'counterType', 'domainId'],
          filter: `NOT ${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.attributes.domainId: uiCounter`,
          perPage: 10000,
        });

      return {
        dailyEvents: rawUsageCounters.reduce((acc, rawUsageCounter) => {
          try {
            const event = transformRawCounter(rawUsageCounter);
            if (event) {
              acc.push(event);
            }
          } catch (_) {
            // swallow error; allows sending successfully transformed objects.
          }
          return acc;
        }, [] as UsageCounterEvent[]),
      };
    },
    isReady: () => true,
  });

  usageCollection.registerCollector(collector);
}
