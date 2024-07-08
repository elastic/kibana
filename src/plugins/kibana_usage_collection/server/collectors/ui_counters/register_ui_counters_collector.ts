/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import { UsageCounters } from '@kbn/usage-collection-plugin/common';
import {
  type UsageCollectionSetup,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '@kbn/usage-collection-plugin/server';
import { type CounterEvent, createCounterFetcher } from '../common/counters';

interface UiCounterEvent {
  appName: string;
  eventName: string;
  counterType: string;
  lastUpdatedAt: string;
  fromTimestamp: string;
  total: number;
}

export interface UiUsageCounters {
  dailyEvents: UiCounterEvent[];
}

const UI: UsageCounters.v1.CounterEventSource = 'ui';
const UI_COUNTERS_FILTER = `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.attributes.source: ${UI}`;

export function registerUiCountersUsageCollector(
  usageCollection: UsageCollectionSetup,
  logger: Logger
) {
  const collector = usageCollection.makeUsageCollector<UiUsageCounters>({
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
    fetch: createCounterFetcher(logger, UI_COUNTERS_FILTER, toDailyEvents),
    isReady: () => true,
  });

  usageCollection.registerCollector(collector);
}

export function toDailyEvents(counters: CounterEvent[]) {
  return {
    dailyEvents: counters.map(toUiCounter),
  };
}

function toUiCounter(counter: CounterEvent): UiCounterEvent {
  const { domainId: appName, counterName: eventName, ...props } = counter;
  return {
    appName,
    eventName,
    ...props,
  };
}
