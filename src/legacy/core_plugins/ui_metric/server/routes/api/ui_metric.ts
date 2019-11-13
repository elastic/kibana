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

import Joi from 'joi';
import { Report } from '@kbn/analytics';
import { Server } from 'hapi';

export async function storeReport(server: any, report: Report) {
  const { getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);

  const uiStatsMetrics = report.uiStatsMetrics ? Object.entries(report.uiStatsMetrics) : [];
  const userAgents = report.userAgent ? Object.entries(report.userAgent) : [];
  return Promise.all([
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
    ...uiStatsMetrics.map(async ([key, metric]) => {
      const { appName, eventName } = metric;
      const savedObjectId = `${appName}:${eventName}`;
      return await internalRepository.incrementCounter('ui-metric', savedObjectId, 'count');
    }),
  ]);
}

export function registerUiMetricRoute(server: Server) {
  server.route({
    method: 'POST',
    path: '/api/telemetry/report',
    options: {
      validate: {
        payload: Joi.object({
          reportVersion: Joi.number().optional(),
          userAgent: Joi.object()
            .pattern(
              /.*/,
              Joi.object({
                key: Joi.string().required(),
                type: Joi.string().required(),
                appName: Joi.string().required(),
                userAgent: Joi.string().required(),
              })
            )
            .allow(null)
            .optional(),
          uiStatsMetrics: Joi.object()
            .pattern(
              /.*/,
              Joi.object({
                key: Joi.string().required(),
                type: Joi.string().required(),
                appName: Joi.string().required(),
                eventName: Joi.string().required(),
                stats: Joi.object({
                  min: Joi.number(),
                  sum: Joi.number(),
                  max: Joi.number(),
                  avg: Joi.number(),
                }).allow(null),
              })
            )
            .allow(null),
        }),
      },
    },
    handler: async (req: any, h: any) => {
      try {
        const report = req.payload;
        await storeReport(server, report);
        return { status: 'ok' };
      } catch (error) {
        return { status: 'fail' };
      }
    },
  });
}
