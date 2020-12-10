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
import { timer } from 'rxjs';
import { ISavedObjectsRepository, Logger, SavedObjectsServiceSetup } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  ApplicationUsageDaily,
  ApplicationUsageTotal,
  ApplicationUsageTransactional,
  registerMappings,
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
  SAVED_OBJECTS_TRANSACTIONAL_TYPE,
} from './saved_objects_types';
import { applicationUsageSchema } from './schema';
import { rollDailyData, rollTotals } from './rollups';
import {
  ROLL_TOTAL_INDICES_INTERVAL,
  ROLL_DAILY_INDICES_INTERVAL,
  ROLL_INDICES_START,
} from './constants';

export interface ApplicationUsageTelemetryReport {
  [appId: string]: {
    clicks_total: number;
    clicks_7_days: number;
    clicks_30_days: number;
    clicks_90_days: number;
    minutes_on_screen_total: number;
    minutes_on_screen_7_days: number;
    minutes_on_screen_30_days: number;
    minutes_on_screen_90_days: number;
  };
}

export function registerApplicationUsageCollector(
  logger: Logger,
  usageCollection: UsageCollectionSetup,
  registerType: SavedObjectsServiceSetup['registerType'],
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined
) {
  registerMappings(registerType);

  const collector = usageCollection.makeUsageCollector<ApplicationUsageTelemetryReport | undefined>(
    {
      type: 'application_usage',
      isReady: () => typeof getSavedObjectsClient() !== 'undefined',
      schema: applicationUsageSchema,
      fetch: async () => {
        const savedObjectsClient = getSavedObjectsClient();
        if (typeof savedObjectsClient === 'undefined') {
          return;
        }
        const [
          { saved_objects: rawApplicationUsageTotals },
          { saved_objects: rawApplicationUsageDaily },
          { saved_objects: rawApplicationUsageTransactional },
        ] = await Promise.all([
          savedObjectsClient.find<ApplicationUsageTotal>({
            type: SAVED_OBJECTS_TOTAL_TYPE,
            perPage: 10000, // We only have 44 apps for now. This limit is OK.
          }),
          savedObjectsClient.find<ApplicationUsageDaily>({
            type: SAVED_OBJECTS_DAILY_TYPE,
            perPage: 10000, // We can have up to 44 apps * 91 days = 4004 docs. This limit is OK
          }),
          savedObjectsClient.find<ApplicationUsageTransactional>({
            type: SAVED_OBJECTS_TRANSACTIONAL_TYPE,
            perPage: 10000, // If we have more than those, we won't report the rest (they'll be rolled up to the daily soon enough to become a problem)
          }),
        ]);

        const applicationUsageFromTotals = rawApplicationUsageTotals.reduce(
          (acc, { attributes: { appId, minutesOnScreen, numberOfClicks } }) => {
            const existing = acc[appId] || { clicks_total: 0, minutes_on_screen_total: 0 };
            return {
              ...acc,
              [appId]: {
                clicks_total: numberOfClicks + existing.clicks_total,
                clicks_7_days: 0,
                clicks_30_days: 0,
                clicks_90_days: 0,
                minutes_on_screen_total: minutesOnScreen + existing.minutes_on_screen_total,
                minutes_on_screen_7_days: 0,
                minutes_on_screen_30_days: 0,
                minutes_on_screen_90_days: 0,
              },
            };
          },
          {} as ApplicationUsageTelemetryReport
        );
        const nowMinus7 = moment().subtract(7, 'days');
        const nowMinus30 = moment().subtract(30, 'days');
        const nowMinus90 = moment().subtract(90, 'days');

        const applicationUsage = [
          ...rawApplicationUsageDaily,
          ...rawApplicationUsageTransactional,
        ].reduce((acc, { attributes: { appId, minutesOnScreen, numberOfClicks, timestamp } }) => {
          const existing = acc[appId] || {
            clicks_total: 0,
            clicks_7_days: 0,
            clicks_30_days: 0,
            clicks_90_days: 0,
            minutes_on_screen_total: 0,
            minutes_on_screen_7_days: 0,
            minutes_on_screen_30_days: 0,
            minutes_on_screen_90_days: 0,
          };

          const timeOfEntry = moment(timestamp);
          const isInLast7Days = timeOfEntry.isSameOrAfter(nowMinus7);
          const isInLast30Days = timeOfEntry.isSameOrAfter(nowMinus30);
          const isInLast90Days = timeOfEntry.isSameOrAfter(nowMinus90);

          const last7Days = {
            clicks_7_days: existing.clicks_7_days + numberOfClicks,
            minutes_on_screen_7_days: existing.minutes_on_screen_7_days + minutesOnScreen,
          };
          const last30Days = {
            clicks_30_days: existing.clicks_30_days + numberOfClicks,
            minutes_on_screen_30_days: existing.minutes_on_screen_30_days + minutesOnScreen,
          };
          const last90Days = {
            clicks_90_days: existing.clicks_90_days + numberOfClicks,
            minutes_on_screen_90_days: existing.minutes_on_screen_90_days + minutesOnScreen,
          };

          return {
            ...acc,
            [appId]: {
              ...existing,
              clicks_total: existing.clicks_total + numberOfClicks,
              minutes_on_screen_total: existing.minutes_on_screen_total + minutesOnScreen,
              ...(isInLast7Days ? last7Days : {}),
              ...(isInLast30Days ? last30Days : {}),
              ...(isInLast90Days ? last90Days : {}),
            },
          };
        }, applicationUsageFromTotals);

        return applicationUsage;
      },
    }
  );

  usageCollection.registerCollector(collector);

  timer(ROLL_INDICES_START, ROLL_DAILY_INDICES_INTERVAL).subscribe(() =>
    rollDailyData(logger, getSavedObjectsClient())
  );
  timer(ROLL_INDICES_START, ROLL_TOTAL_INDICES_INTERVAL).subscribe(() =>
    rollTotals(logger, getSavedObjectsClient())
  );
}
