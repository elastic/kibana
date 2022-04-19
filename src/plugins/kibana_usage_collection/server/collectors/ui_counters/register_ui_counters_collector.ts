/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { mergeWith } from 'lodash';
import type { Subject } from 'rxjs';

import {
  CollectorFetchContext,
  UsageCollectionSetup,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
  UsageCountersSavedObject,
  UsageCountersSavedObjectAttributes,
  serializeCounterKey,
} from '@kbn/usage-collection-plugin/server';

import {
  deserializeUiCounterName,
  serializeUiCounterName,
} from '@kbn/usage-collection-plugin/common/ui_counters';
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

export function transformRawUiCounterObject(
  rawUiCounter: UICounterSavedObject
): UiCounterEvent | undefined {
  const {
    id,
    attributes: { count },
    updated_at: lastUpdatedAt,
  } = rawUiCounter;
  if (typeof count !== 'number' || count < 1) {
    return;
  }

  const [appName, , counterType, ...restId] = id.split(':');
  const eventName = restId.join(':');
  const fromTimestamp = moment(lastUpdatedAt).utc().startOf('day').format();

  return {
    appName,
    eventName,
    lastUpdatedAt,
    fromTimestamp,
    counterType,
    total: count,
  };
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

export const createFetchUiCounters = (stopUsingUiCounterIndicies$: Subject<void>) =>
  async function fetchUiCounters({ soClient }: CollectorFetchContext) {
    const { saved_objects: rawUsageCounters } =
      await soClient.find<UsageCountersSavedObjectAttributes>({
        type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
        fields: ['count', 'counterName', 'counterType', 'domainId'],
        filter: `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.attributes.domainId: uiCounter`,
        perPage: 10000,
      });

    const skipFetchingUiCounters = stopUsingUiCounterIndicies$.isStopped;
    const result =
      skipFetchingUiCounters ||
      (await soClient.find<UICounterSavedObjectAttributes>({
        type: UI_COUNTER_SAVED_OBJECT_TYPE,
        fields: ['count'],
        perPage: 10000,
      }));

    const rawUiCounters = typeof result === 'object' ? result.saved_objects : [];
    const dailyEventsFromUiCounters = rawUiCounters.reduce((acc, raw) => {
      try {
        const event = transformRawUiCounterObject(raw);
        if (event) {
          const { appName, eventName, counterType } = event;
          const key = serializeCounterKey({
            domainId: 'uiCounter',
            counterName: serializeUiCounterName({ appName, eventName }),
            counterType,
            date: event.lastUpdatedAt,
          });

          acc[key] = event;
        }
      } catch (_) {
        // swallow error; allows sending successfully transformed objects.
      }
      return acc;
    }, {} as Record<string, UiCounterEvent>);

    const dailyEventsFromUsageCounters = rawUsageCounters.reduce((acc, raw) => {
      try {
        const event = transformRawUsageCounterObject(raw);
        if (event) {
          acc[raw.id] = event;
        }
      } catch (_) {
        // swallow error; allows sending successfully transformed objects.
      }
      return acc;
    }, {} as Record<string, UiCounterEvent>);

    const mergedDailyCounters = mergeWith(
      dailyEventsFromUsageCounters,
      dailyEventsFromUiCounters,
      (value: UiCounterEvent | undefined, srcValue: UiCounterEvent): UiCounterEvent => {
        if (!value) {
          return srcValue;
        }

        return {
          ...srcValue,
          total: srcValue.total + value.total,
        };
      }
    );

    return { dailyEvents: Object.values(mergedDailyCounters) };
  };

export function registerUiCountersUsageCollector(
  usageCollection: UsageCollectionSetup,
  stopUsingUiCounterIndicies$: Subject<void>
) {
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
    fetch: createFetchUiCounters(stopUsingUiCounterIndicies$),
    isReady: () => true,
  });

  usageCollection.registerCollector(collector);
}
