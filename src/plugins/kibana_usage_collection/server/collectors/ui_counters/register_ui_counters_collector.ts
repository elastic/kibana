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

import { deserializeUiCounterName } from '@kbn/usage-collection-plugin/common/ui_counters';

interface UiCounterEvent {
  appName: string;
  eventName: string;
  lastUpdatedAt?: string;
  fromTimestamp?: string;
  counterType: string;
  total: number;
}

export interface UiCountersUsage {
  dailyEvents: UiCounterEvent[];
}

export function transformRawUsageCounterObject(
  rawUsageCounter: UsageCountersSavedObject
): UiCounterEvent | undefined {
  const {
    attributes: { count, counterName, counterType, domainId },
    updated_at: lastUpdatedAt,
  } = rawUsageCounter;

  if (domainId !== 'uiCounter' || typeof count !== 'number' || count < 1) {
    return;
  }

  const fromTimestamp = moment(lastUpdatedAt).utc().startOf('day').format();
  const { appName, eventName } = deserializeUiCounterName(counterName);

  return {
    appName,
    eventName,
    lastUpdatedAt,
    fromTimestamp,
    counterType,
    total: count,
  };
}

export async function fetchUiCounters({ soClient }: CollectorFetchContext) {
  const finder = soClient.createPointInTimeFinder<UsageCountersSavedObjectAttributes>({
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    fields: ['count', 'counterName', 'counterType', 'domainId'],
    filter: `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.attributes.domainId: uiCounter`,
    perPage: 1000,
  });

  const dailyEvents: UiCounterEvent[] = [];

  for await (const { saved_objects: rawUsageCounters } of finder.find()) {
    rawUsageCounters.forEach((raw) => {
      try {
        const event = transformRawUsageCounterObject(raw);
        if (event) {
          dailyEvents.push(event);
        }
      } catch (_) {
        // swallow error; allows sending successfully transformed objects.
      }
    });
  }

  return { dailyEvents };
}

export function registerUiCountersUsageCollector(usageCollection: UsageCollectionSetup) {
  const collector = usageCollection.makeUsageCollector<UiCountersUsage>({
    type: 'ui_counters',
    schema: {
      dailyEvents: {
        type: 'array',
        items: {
          appName: {
            type: 'keyword',
            _meta: { description: 'Name of the app reporting ui counts.' },
          },
          eventName: {
            type: 'keyword',
            _meta: { description: 'Name of the event that happened.' },
          },
          lastUpdatedAt: {
            type: 'date',
            _meta: { description: 'Time at which the metric was last updated.' },
          },
          fromTimestamp: {
            type: 'date',
            _meta: { description: 'Time at which the metric was captured.' },
          },
          counterType: { type: 'keyword', _meta: { description: 'The type of counter used.' } },
          total: {
            type: 'integer',
            _meta: { description: 'The total number of times the event happened.' },
          },
        },
      },
    },
    fetch: fetchUiCounters,
    isReady: () => true,
  });

  usageCollection.registerCollector(collector);
}
