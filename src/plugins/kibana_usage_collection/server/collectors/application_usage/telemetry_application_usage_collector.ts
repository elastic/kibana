/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { timer } from 'rxjs';
import { ISavedObjectsRepository, Logger, SavedObjectsServiceSetup } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { MAIN_APP_DEFAULT_VIEW_ID } from '@kbn/usage-collection-plugin/common/constants';
import {
  ApplicationUsageDaily,
  ApplicationUsageTotal,
  registerMappings,
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
} from './saved_objects_types';
import { applicationUsageSchema } from './schema';
import { rollTotals, rollDailyData, serializeKey } from './rollups';
import {
  ROLL_TOTAL_INDICES_INTERVAL,
  ROLL_DAILY_INDICES_INTERVAL,
  ROLL_INDICES_START,
} from './constants';
import { ApplicationUsageTelemetryReport, ApplicationUsageViews } from './types';

export const transformByApplicationViews = (
  report: ApplicationUsageViews
): ApplicationUsageTelemetryReport => {
  const reportMetrics = Object.values(report);
  const mainApplications = reportMetrics.filter(
    (appView) => appView.viewId === MAIN_APP_DEFAULT_VIEW_ID
  );
  const appViews = reportMetrics.filter((appView) => appView.viewId !== MAIN_APP_DEFAULT_VIEW_ID);

  return mainApplications.reduce((acc, mainApplication) => {
    const currentAppViews = appViews.filter((appView) => appView.appId === mainApplication.appId);

    acc[mainApplication.appId] = {
      ...mainApplication,
      views: currentAppViews,
    };

    return acc;
  }, {} as ApplicationUsageTelemetryReport);
};

export function registerApplicationUsageCollector(
  logger: Logger,
  usageCollection: UsageCollectionSetup,
  registerType: SavedObjectsServiceSetup['registerType'],
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined
) {
  registerMappings(registerType);

  timer(ROLL_INDICES_START, ROLL_TOTAL_INDICES_INTERVAL).subscribe(() =>
    rollTotals(logger, getSavedObjectsClient())
  );

  const dailyRollingSub = timer(ROLL_INDICES_START, ROLL_DAILY_INDICES_INTERVAL).subscribe(
    async () => {
      const success = await rollDailyData(logger, getSavedObjectsClient());
      // we only need to roll the transactional documents once to assure BWC
      // once we rolling succeeds, we can stop.
      if (success) {
        dailyRollingSub.unsubscribe();
      }
    }
  );

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
        ] = await Promise.all([
          savedObjectsClient.find<ApplicationUsageTotal>({
            type: SAVED_OBJECTS_TOTAL_TYPE,
            perPage: 10000, // We only have 44 apps for now. This limit is OK.
          }),
          savedObjectsClient.find<ApplicationUsageDaily>({
            type: SAVED_OBJECTS_DAILY_TYPE,
            perPage: 10000, // We can have up to 44 apps * 91 days = 4004 docs. This limit is OK
          }),
        ]);

        const applicationUsageFromTotals = rawApplicationUsageTotals.reduce(
          (
            acc,
            {
              attributes: {
                appId,
                viewId = MAIN_APP_DEFAULT_VIEW_ID,
                minutesOnScreen,
                numberOfClicks,
              },
            }
          ) => {
            const existing = acc[appId] || { clicks_total: 0, minutes_on_screen_total: 0 };
            return {
              ...acc,
              [serializeKey(appId, viewId)]: {
                appId,
                viewId,
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

        const applicationUsage = rawApplicationUsageDaily.reduce(
          (
            acc,
            {
              attributes: {
                appId,
                viewId = MAIN_APP_DEFAULT_VIEW_ID,
                minutesOnScreen,
                numberOfClicks,
                timestamp,
              },
            }
          ) => {
            const existing = acc[serializeKey(appId, viewId)] || {
              appId,
              viewId,
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
              [serializeKey(appId, viewId)]: {
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

        return transformByApplicationViews(applicationUsage);
      },
    }
  );

  usageCollection.registerCollector(collector);
}
