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

import { ISavedObjectsRepository, SavedObject } from 'src/core/server';
import { ReportSchemaType } from './schema';

export async function storeReport(
  internalRepository: ISavedObjectsRepository,
  report: ReportSchemaType
) {
  const uiStatsMetrics = report.uiStatsMetrics ? Object.entries(report.uiStatsMetrics) : [];
  const userAgents = report.userAgent ? Object.entries(report.userAgent) : [];
  const appUsage = report.application_usage ? Object.entries(report.application_usage) : [];
  const timestamp = new Date();
  return Promise.all<{ saved_objects: Array<SavedObject<any>> }>([
    ...userAgents.map(async ([key, metric]) => {
      const { userAgent } = metric;
      const savedObjectId = `${key}:${userAgent}`;
      return {
        saved_objects: [
          await internalRepository.create(
            'ui-metric',
            { count: 1 },
            {
              id: savedObjectId,
              overwrite: true,
            }
          ),
        ],
      };
    }),
    ...uiStatsMetrics.map(async ([key, metric]) => {
      const { appName, eventName } = metric;
      const savedObjectId = `${appName}:${eventName}`;
      return {
        saved_objects: [
          await internalRepository.incrementCounter('ui-metric', savedObjectId, ['count']),
        ],
      };
    }),
    appUsage.length
      ? internalRepository.bulkCreate(
          appUsage.map(([appId, metric]) => ({
            type: 'application_usage_transactional',
            attributes: { ...metric, appId, timestamp },
          }))
        )
      : { saved_objects: [] },
  ]);
}
