/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
import { commonRouteConfig } from '../constants';
import { stripUnmappedKeys } from '../scope_tooling';
import { DASHBOARD_INTERNAL_API_PATH } from '../../../common/constants';
import { getExportSourceRequestBodySchema, getExportSourceResponseBodySchema } from './schemas';

/** Register the export source route.
 * This route uses an internal API path because it is not intended for public use.
 * It is only used by the dashboard app to sanitize the export source for the export share integration.
 */
export function registerExportSourceRoute(router: VersionedRouter<RequestHandlerContext>) {
  const exportSourceRoute = router.post({
    path: `${DASHBOARD_INTERNAL_API_PATH}/_export_source`,
    summary: 'Sanitize a dashboard export source',
    ...commonRouteConfig,
  });

  exportSourceRoute.addVersion(
    {
      version: '1',
      validate: {
        request: {
          body: getExportSourceRequestBodySchema(),
        },
        response: {
          200: {
            body: getExportSourceResponseBodySchema,
          },
        },
      },
    },
    async (_ctx, req, res) => {
      try {
        const { data, warnings } = stripUnmappedKeys(req.body);
        return res.ok({
          body: {
            data,
            ...(warnings.length ? { warnings } : {}),
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return res.badRequest({
          body: { message },
        });
      }
    }
  );
}
