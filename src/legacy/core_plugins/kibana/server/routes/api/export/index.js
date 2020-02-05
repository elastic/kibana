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
import moment from 'moment';

import { exportDashboards } from '../../../lib/export/export_dashboards';

export function exportApi(server) {
  server.route({
    path: '/api/kibana/dashboards/export',
    config: {
      validate: {
        query: Joi.object().keys({
          dashboard: Joi.alternatives()
            .try(Joi.string(), Joi.array().items(Joi.string()))
            .required(),
        }),
      },
      tags: ['api'],
    },
    method: ['GET'],
    handler: async (req, h) => {
      const currentDate = moment.utc();
      return exportDashboards(req).then(resp => {
        const json = JSON.stringify(resp, null, '  ');
        const filename = `kibana-dashboards.${currentDate.format('YYYY-MM-DD-HH-mm-ss')}.json`;
        return h
          .response(json)
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Type', 'application/json')
          .header('Content-Length', Buffer.byteLength(json, 'utf8'));
      });
    },
  });
}
