/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { ensureNoUnsafeProperties } from '@kbn/std';
import { getVisData } from '../lib/get_vis_data';
import { ROUTES } from '../../common/constants';
import { Framework } from '../plugin';
import type { VisTypeTimeseriesRouter } from '../types';
import type { VisPayload } from '../../common/types';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const visDataRoutes = (router: VisTypeTimeseriesRouter, framework: Framework) => {
  router.post<{}, {}, VisPayload>(
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

      const results = await getVisData(requestContext, request, framework);
      return response.ok({ body: results });
    }
  );
};
