/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { type Observable, takeUntil, timer } from 'rxjs';
import type { ISavedObjectsRepository, Logger, SavedObjectsServiceSetup } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { MAIN_APP_DEFAULT_VIEW_ID } from '@kbn/usage-collection-plugin/common/constants';
import {
  type ApplicationUsageDaily,
  type ApplicationUsageTotal,
  registerMappings,
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
} from './saved_objects_types';
import { applicationUsageSchema } from './schema';
import { rollTotals, serializeKey } from './rollups';
import { ROLL_TOTAL_INDICES_INTERVAL, ROLL_INDICES_START } from './constants';
import type { ApplicationUsageTelemetryReport, ApplicationUsageViews } from './types';

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
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined,
  pluginStop$: Observable<void>
) {
  registerMappings(registerType);

  timer(ROLL_INDICES_START, ROLL_TOTAL_INDICES_INTERVAL)
    .pipe(takeUntil(pluginStop$))
    .subscribe(() => rollTotals(logger, getSavedObjectsClient()));

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

        const usageTotalsFinder = savedObjectsClient.createPointInTimeFinder<ApplicationUsageTotal>(
          {
            type: SAVED_OBJECTS_TOTAL_TYPE,
            perPage: 200,
          }
        );
        const applicationUsageFromTotals: ApplicationUsageTelemetryReport = {};
        for await (const { saved_objects: savedObjects } of usageTotalsFinder.find()) {
          for (const savedObject of savedObjects) {
            const {
              appId,
              viewId = MAIN_APP_DEFAULT_VIEW_ID,
              minutesOnScreen,
              numberOfClicks,
            } = savedObject.attributes;
            const existing = applicationUsageFromTotals[appId] || {
              clicks_total: 0,
              minutes_on_screen_total: 0,
            };
            applicationUsageFromTotals[serializeKey(appId, viewId)] = {
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
            };
          }
        }

        const nowMinus7 = moment().subtract(7, 'days');
        const nowMinus30 = moment().subtract(30, 'days');
        const nowMinus90 = moment().subtract(90, 'days');

        const usageDailyFinder = savedObjectsClient.createPointInTimeFinder<ApplicationUsageDaily>({
          type: SAVED_OBJECTS_DAILY_TYPE,
          perPage: 200,
        });
        const applicationUsage = { ...applicationUsageFromTotals };
        for await (const { saved_objects: savedObjects } of usageDailyFinder.find()) {
          for (const savedObject of savedObjects) {
            const {
              appId,
              viewId = MAIN_APP_DEFAULT_VIEW_ID,
              minutesOnScreen,
              numberOfClicks,
              timestamp,
            } = savedObject.attributes;
            const existing = applicationUsage[serializeKey(appId, viewId)] || {
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

            applicationUsage[serializeKey(appId, viewId)] = {
              ...existing,
              clicks_total: existing.clicks_total + numberOfClicks,
              minutes_on_screen_total: existing.minutes_on_screen_total + minutesOnScreen,
              ...(isInLast7Days ? last7Days : {}),
              ...(isInLast30Days ? last30Days : {}),
              ...(isInLast90Days ? last90Days : {}),
            };
          }
        }

        return transformByApplicationViews(applicationUsage);
      },
    }
  );

  usageCollection.registerCollector(collector);
}
