/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ISavedObjectsRepository } from 'src/core/server';
import moment from 'moment';
import { chain, sumBy } from 'lodash';
import { ReportSchemaType } from './schema';

export async function storeReport(
  internalRepository: ISavedObjectsRepository,
  report: ReportSchemaType
) {
  const uiCounters = report.uiCounter ? Object.entries(report.uiCounter) : [];
  const userAgents = report.userAgent ? Object.entries(report.userAgent) : [];
  const appUsage = report.application_usage ? Object.values(report.application_usage) : [];

  const momentTimestamp = moment();
  const timestamp = momentTimestamp.toDate();
  const date = momentTimestamp.format('DDMMYYYY');

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
    ...uiCounters.map(async ([key, metric]) => {
      const { appName, eventName, total, type } = metric;
      const savedObjectId = `${appName}:${date}:${type}:${eventName}`;
      return [
        await internalRepository.incrementCounter('ui-counter', savedObjectId, [
          { fieldName: 'count', incrementBy: total },
        ]),
      ];
    }),
    // Application Usage
    ...[
      (async () => {
        if (!appUsage.length) return [];
        const { saved_objects: savedObjects } = await internalRepository.bulkCreate(
          appUsage.map((metric) => ({
            type: 'application_usage_transactional',
            attributes: {
              ...metric,
              timestamp,
            },
          }))
        );

        return savedObjects;
      })(),
    ],
  ]);
}
