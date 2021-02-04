/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, KibanaRequest } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { getVisData, GetVisDataOptions } from '../lib/get_vis_data';
import { visPayloadSchema } from '../../common/vis_schema';
import { ROUTES } from '../../common/constants';
import { ValidationTelemetryServiceSetup } from '../index';
import { Framework } from '../plugin';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const visDataRoutes = (
  router: IRouter,
  framework: Framework,
  { logFailedValidation }: ValidationTelemetryServiceSetup
) => {
  router.post(
    {
      path: ROUTES.VIS_DATA,
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        visPayloadSchema.validate(request.body);
      } catch (error) {
        logFailedValidation();

        framework.logger.warn(
          `Request validation error: ${error.message}. This most likely means your TSVB visualization contains outdated configuration. You can report this problem under https://github.com/elastic/kibana/issues/new?template=Bug_report.md`
        );
      }

      try {
        const results = await getVisData(
          requestContext,
          request as KibanaRequest<{}, {}, GetVisDataOptions>,
          framework
        );
        return response.ok({ body: results });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
