/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
