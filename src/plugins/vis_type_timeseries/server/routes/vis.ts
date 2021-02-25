/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { ensureNoUnsafeProperties } from '@kbn/std';
import { getVisData, GetVisDataOptions } from '../lib/get_vis_data';
import { visPayloadSchema } from '../../common/vis_schema';
import { ROUTES } from '../../common/constants';
import { Framework } from '../plugin';
import type { VisTypeTimeseriesRouter } from '../types';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const visDataRoutes = (router: VisTypeTimeseriesRouter, framework: Framework) => {
  router.post(
    {
      path: ROUTES.VIS_DATA,
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        ensureNoUnsafeProperties(request.body);
      } catch (error) {
        return response.badRequest({
          body: error.message,
        });
      }

      try {
        visPayloadSchema.validate(request.body);
      } catch (error) {
        framework.logger.debug(
          `Request validation error: ${error.message}. This most likely means your TSVB visualization contains outdated configuration. You can report this problem under https://github.com/elastic/kibana/issues/new?template=Bug_report.md`
        );
      }

      const results = await getVisData(
        requestContext,
        request as KibanaRequest<{}, {}, GetVisDataOptions>,
        framework
      );
      return response.ok({ body: results });
    }
  );
};
