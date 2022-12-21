/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { Writable } from '@kbn/utility-types';
import { ISavedObjectsRepository } from '@kbn/core/server';
import { ApplicationUsageReport } from './schema';
import { getDailyId } from '../../common/application_usage';

type WritableApplicationUsageReport = Writable<ApplicationUsageReport>;

export const storeApplicationUsage = async (
  repository: ISavedObjectsRepository,
  appUsages: ApplicationUsageReport[],
  timestamp: Date
) => {
  if (!appUsages.length) {
    return;
  }

  const dayId = getDayId(timestamp);
  const aggregatedReports = aggregateAppUsages(appUsages);

  return Promise.allSettled(
    aggregatedReports.map(async (report) => incrementUsageCounters(repository, report, dayId))
  );
};

const aggregateAppUsages = (appUsages: ApplicationUsageReport[]) => {
  return [
    ...appUsages
      .reduce((map, appUsage) => {
        const key = getKey(appUsage);
        const aggregated: WritableApplicationUsageReport = map.get(key) ?? {
          appId: appUsage.appId,
          viewId: appUsage.viewId,
          minutesOnScreen: 0,
          numberOfClicks: 0,
        };

        aggregated.minutesOnScreen += appUsage.minutesOnScreen;
        aggregated.numberOfClicks += appUsage.numberOfClicks;

        map.set(key, aggregated);
        return map;
      }, new Map<string, ApplicationUsageReport>())
      .values(),
  ];
};

const incrementUsageCounters = (
  repository: ISavedObjectsRepository,
  { appId, viewId, numberOfClicks, minutesOnScreen }: WritableApplicationUsageReport,
  dayId: string
) => {
  const dailyId = getDailyId({ appId, viewId, dayId });

  return repository.incrementCounter(
    'application_usage_daily',
    dailyId,
    [
      { fieldName: 'numberOfClicks', incrementBy: numberOfClicks },
      { fieldName: 'minutesOnScreen', incrementBy: minutesOnScreen },
    ],
    {
      upsertAttributes: {
        appId,
        viewId,
        timestamp: getTimestamp(dayId),
      },
    }
  );
};

const getKey = ({ viewId, appId }: ApplicationUsageReport) => `${appId}___${viewId}`;

const getDayId = (timestamp: Date) => moment(timestamp).format('YYYY-MM-DD');

const getTimestamp = (dayId: string) => {
  // Concatenating the day in YYYY-MM-DD form to T00:00:00Z to reduce the TZ effects
  return moment(`${moment(dayId).format('YYYY-MM-DD')}T00:00:00Z`).toISOString();
};
