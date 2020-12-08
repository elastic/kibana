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
  const appUsage = report.application_usage ? Object.entries(report.application_usage) : [];

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
          appUsage.map(([appId, metric]) => ({
            type: 'application_usage_transactional',
            attributes: { ...metric, appId, timestamp },
          }))
        );

        return savedObjects;
      })(),
    ],
  ]);
}
