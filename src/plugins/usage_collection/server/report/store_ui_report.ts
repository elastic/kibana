/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository } from '@kbn/core/server';
import moment from 'moment';
import { chain, sumBy } from 'lodash';
import { ReportSchemaType } from './schema';
import { storeApplicationUsage } from './store_application_usage';
import { type UsageCountersServiceSetup } from '../usage_counters';

export async function storeUiReport(
  internalRepository: ISavedObjectsRepository,
  usageCounters: UsageCountersServiceSetup,
  report: ReportSchemaType
) {
  const uiCounters = report.uiCounter ? Object.entries(report.uiCounter) : [];
  const userAgents = report.userAgent ? Object.entries(report.userAgent) : [];
  const appUsages = report.application_usage ? Object.values(report.application_usage) : [];

  const momentTimestamp = moment();
  const timestamp = momentTimestamp.toDate();

  return Promise.allSettled([
    // User Agent
    ...userAgents.map(async ([key, metric]) => {
      const { userAgent } = metric;
      const savedObjectId = `${key}:${userAgent}`;
      return await internalRepository.create(
        'ui-metric',
        { count: 1 },
        {
          id: savedObjectId,
          overwrite: true,
          refresh: false,
        }
      );
    }),
    // Deprecated UI metrics, Use data from UI Counters.
    ...chain(report.uiCounter)
      .groupBy((e) => `${e.appName}:${e.eventName}`)
      .entries()
      .map(([savedObjectId, metric]) => {
        return {
          savedObjectId,
          incrementBy: sumBy(metric, 'total'),
        };
      })
      .map(async ({ savedObjectId, incrementBy }) => {
        return await internalRepository.incrementCounter('ui-metric', savedObjectId, [
          { fieldName: 'count', incrementBy },
        ]);
      })
      .value(),
    // UI Counters
    ...uiCounters.map(async ([, metric]) => {
      const { appName, eventName, total, type } = metric;

      const counter =
        usageCounters.getUsageCounterByDomainId(appName) ??
        usageCounters.createUsageCounter(appName);

      counter.incrementCounter({
        counterName: eventName,
        counterType: type,
        incrementBy: total,
        source: 'ui',
      });
    }),
    // Application Usage
    storeApplicationUsage(internalRepository, appUsages, timestamp),
  ]);
}
