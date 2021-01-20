/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { CollectorFetchContext, UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  UICounterSavedObject,
  UICounterSavedObjectAttributes,
  UI_COUNTER_SAVED_OBJECT_TYPE,
} from './ui_counter_saved_object_type';

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

export function transformRawCounter(rawUiCounter: UICounterSavedObject) {
  const { id, attributes, updated_at: lastUpdatedAt } = rawUiCounter;
  const [appName, , counterType, ...restId] = id.split(':');
  const eventName = restId.join(':');
  const counterTotal: unknown = attributes.count;
  const total = typeof counterTotal === 'number' ? counterTotal : 0;
  const fromTimestamp = moment(lastUpdatedAt).utc().startOf('day').format();

  return {
    appName,
    eventName,
    lastUpdatedAt,
    fromTimestamp,
    counterType,
    total,
  };
}

export function registerUiCountersUsageCollector(usageCollection: UsageCollectionSetup) {
  const collector = usageCollection.makeUsageCollector<UiCountersUsage>({
    type: 'ui_counters',
    schema: {
      dailyEvents: {
        type: 'array',
        items: {
          appName: { type: 'keyword' },
          eventName: { type: 'keyword' },
          lastUpdatedAt: { type: 'date' },
          fromTimestamp: { type: 'date' },
          counterType: { type: 'keyword' },
          total: { type: 'integer' },
        },
      },
    },
    fetch: async ({ soClient }: CollectorFetchContext) => {
      const { saved_objects: rawUiCounters } = await soClient.find<UICounterSavedObjectAttributes>({
        type: UI_COUNTER_SAVED_OBJECT_TYPE,
        fields: ['count'],
        perPage: 10000,
      });

      return {
        dailyEvents: rawUiCounters.reduce((acc, raw) => {
          try {
            const aggEvent = transformRawCounter(raw);
            acc.push(aggEvent);
          } catch (_) {
            // swallow error; allows sending successfully transformed objects.
          }
          return acc;
        }, [] as UiCounterEvent[]),
      };
    },
    isReady: () => true,
  });

  usageCollection.registerCollector(collector);
}
