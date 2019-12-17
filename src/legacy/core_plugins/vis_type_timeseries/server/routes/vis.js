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

import { getVisData } from '../lib/get_vis_data';
import { visPayloadSchema } from './post_vis_schema';
import Boom from 'boom';
import { i18n } from '@kbn/i18n';

export const visDataRoutes = (server, { logFailedValidation }) => {
  server.route({
    path: '/api/metrics/vis/data',
    method: 'POST',
    handler: async req => {
      const { error } = visPayloadSchema.validate(req.payload);
      if (error) {
        logFailedValidation();
        if (server.config().get('metrics.failOnRequestValidation')) {
          server.log(
            ['tsvb', 'error'],
            `Request validation error: ${error}. To allow outdated requests, set 'metrics.failOnRequestValidation' to false.`
          );
          throw new Boom(
            i18n.translate('visTypeTimeseries.validationError', {
              defaultMessage:
                // eslint-disable-next-line max-len
                'Request validation failed. To disable request validation please contact your system administrator. Detailed error message: {error}',
              values: {
                error,
              },
            }),
            { statusCode: 400 }
          );
        }
        server.log(
          ['tsvb', 'warning'],
          `Request validation error: ${error}. This most likely means your TSVB visualization contains outdated configuration. You can report this problem under https://github.com/elastic/kibana/issues/new?template=Bug_report.md`
        );
      }
      try {
        return await getVisData(req);
      } catch (err) {
        if (err.isBoom && err.status === 401) {
          return err;
        }

        throw Boom.boomify(err, { statusCode: 500 });
      }
    },
  });
};
