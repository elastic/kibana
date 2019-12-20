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

import { i18n } from '@kbn/i18n';
import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { getVisData } from '../lib/get_vis_data';
import { visPayloadSchema } from './post_vis_schema';
import {
  Framework,
  ValidationTelemetryServiceSetup,
} from '../../../../../plugins/vis_type_timeseries/server';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const visDataRoutes = (
  router: IRouter,
  framework: Framework,
  { logFailedValidation }: ValidationTelemetryServiceSetup
) => {
  let failOnRequestValidation = false;

  framework.config$.subscribe(config => {
    failOnRequestValidation = config.failOnRequestValidation;
  });

  router.post(
    {
      path: '/api/metrics/vis/data',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      const { error: validationError } = visPayloadSchema.validate(request.body);
      if (validationError) {
        logFailedValidation();
        if (failOnRequestValidation) {
          framework.logger.error(
            `Request validation error: ${validationError}. To allow outdated requests, set 'metrics.failOnRequestValidation' to false.`
          );
          return response.badRequest({
            body: i18n.translate('visTypeTimeseries.validationError', {
              defaultMessage:
                'Request validation failed. To disable request validation please contact your system administrator. Detailed error message: {validationError}',
              values: {
                validationError: validationError.message,
              },
            }),
          });
        }
        framework.logger.warn(
          `Request validation error: ${validationError.message}. This most likely means your TSVB visualization contains outdated configuration. You can report this problem under https://github.com/elastic/kibana/issues/new?template=Bug_report.md`
        );
      }
      try {
        const results = await getVisData(requestContext, request.body, framework);
        return response.ok({ body: results });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
