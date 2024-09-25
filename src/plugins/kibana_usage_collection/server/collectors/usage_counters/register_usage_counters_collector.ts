/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { UsageCounters } from '@kbn/usage-collection-plugin/common';
import {
  type UsageCollectionSetup,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '@kbn/usage-collection-plugin/server';
import { type CounterEvent, createCounterFetcher } from '../common/counters';

export interface UsageCounters {
  dailyEvents: CounterEvent[];
}

const SERVER: UsageCounters.v1.CounterEventSource = 'server';
const SERVER_COUNTERS_FILTER = `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.attributes.source: ${SERVER}`;

export function registerUsageCountersUsageCollector(
  usageCollection: UsageCollectionSetup,
  logger: Logger
) {
  const collector = usageCollection.makeUsageCollector<UsageCounters>({
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
    fetch: createCounterFetcher(logger, SERVER_COUNTERS_FILTER, toDailyEvents),
    isReady: () => true,
  });

  usageCollection.registerCollector(collector);
}

export function toDailyEvents(counters: CounterEvent[]) {
  return {
    dailyEvents: counters,
  };
}
