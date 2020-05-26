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
import { ISavedObjectsRepository, SavedObjectsServiceSetup } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { findAll } from '../find_all';
import {
  ApplicationUsageTotal,
  ApplicationUsageTransactional,
  registerMappings,
} from './saved_objects_types';

/**
 * Roll indices every 24h
 */
export const ROLL_INDICES_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Start rolling indices after 5 minutes up
 */
export const ROLL_INDICES_START = 5 * 60 * 1000;

export const SAVED_OBJECTS_TOTAL_TYPE = 'application_usage_totals';
export const SAVED_OBJECTS_TRANSACTIONAL_TYPE = 'application_usage_transactional';

interface ApplicationUsageTelemetryReport {
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
  usageCollection: UsageCollectionSetup,
  registerType: SavedObjectsServiceSetup['registerType'],
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined
) {
  registerMappings(registerType);

  const collector = usageCollection.makeUsageCollector({
    type: 'application_usage',
    isReady: () => typeof getSavedObjectsClient() !== 'undefined',
    fetch: async () => {
      const savedObjectsClient = getSavedObjectsClient();
      if (typeof savedObjectsClient === 'undefined') {
        return;
      }
      const [rawApplicationUsageTotals, rawApplicationUsageTransactional] = await Promise.all([
        findAll<ApplicationUsageTotal>(savedObjectsClient, { type: SAVED_OBJECTS_TOTAL_TYPE }),
        findAll<ApplicationUsageTransactional>(savedObjectsClient, {
          type: SAVED_OBJECTS_TRANSACTIONAL_TYPE,
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

      const applicationUsage = rawApplicationUsageTransactional.reduce(
        (acc, { attributes: { appId, minutesOnScreen, numberOfClicks, timestamp } }) => {
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

          const timeOfEntry = moment(timestamp as string);
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
        },
        applicationUsageFromTotals
      );

      return applicationUsage;
    },
  });

  usageCollection.registerCollector(collector);

  setInterval(() => rollTotals(getSavedObjectsClient()), ROLL_INDICES_INTERVAL);
  setTimeout(() => rollTotals(getSavedObjectsClient()), ROLL_INDICES_START);
}

async function rollTotals(savedObjectsClient?: ISavedObjectsRepository) {
  if (!savedObjectsClient) {
    return;
  }

  try {
    const [rawApplicationUsageTotals, rawApplicationUsageTransactional] = await Promise.all([
      findAll<ApplicationUsageTotal>(savedObjectsClient, { type: SAVED_OBJECTS_TOTAL_TYPE }),
      findAll<ApplicationUsageTransactional>(savedObjectsClient, {
        type: SAVED_OBJECTS_TRANSACTIONAL_TYPE,
        filter: `${SAVED_OBJECTS_TRANSACTIONAL_TYPE}.attributes.timestamp < now-90d`,
      }),
    ]);

    const existingTotals = rawApplicationUsageTotals.reduce(
      (acc, { attributes: { appId, numberOfClicks, minutesOnScreen } }) => {
        return {
          ...acc,
          // No need to sum because there should be 1 document per appId only
          [appId]: { appId, numberOfClicks, minutesOnScreen },
        };
      },
      {} as Record<string, { appId: string; minutesOnScreen: number; numberOfClicks: number }>
    );

    const totals = rawApplicationUsageTransactional.reduce((acc, { attributes, id }) => {
      const { appId, numberOfClicks, minutesOnScreen } = attributes;

      const existing = acc[appId] || { minutesOnScreen: 0, numberOfClicks: 0 };

      return {
        ...acc,
        [appId]: {
          appId,
          numberOfClicks: numberOfClicks + existing.numberOfClicks,
          minutesOnScreen: minutesOnScreen + existing.minutesOnScreen,
        },
      };
    }, existingTotals);

    await Promise.all([
      Object.entries(totals).length &&
        savedObjectsClient.bulkCreate<ApplicationUsageTotal>(
          Object.entries(totals).map(([id, entry]) => ({
            type: SAVED_OBJECTS_TOTAL_TYPE,
            id,
            attributes: entry,
          })),
          { overwrite: true }
        ),
      ...rawApplicationUsageTransactional.map(
        ({ id }) => savedObjectsClient.delete(SAVED_OBJECTS_TRANSACTIONAL_TYPE, id) // There is no bulkDelete :(
      ),
    ]);
  } catch (err) {
    // Silent failure
  }
}
