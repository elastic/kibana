/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, savedObjectId } from '@kbn/zod';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { logRequest, writeErrorHandler } from '@kbn/as-code-utils';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { CoreSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsExportError } from '@kbn/core/server';
import { exportReferencedObjectsResponseSchema } from '@kbn/saved-objects-management-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import {
  DASHBOARD_API_PATH,
  DASHBOARD_API_VERSION,
  DASHBOARD_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { StartDeps } from '../../plugin';
import type { DashboardPluginStart } from '../../types';
import {
  isExportReferencedObjectsEnabled,
  referencedObjectsRouteConfig,
  TECHNICAL_PREVIEW_NOTE,
} from './route_config';

export const registerExportRoute = (
  router: VersionedRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<StartDeps, DashboardPluginStart>['getStartServices'],
  usageCounter: UsageCounter | undefined,
  maxImportExportSize: number,
  logger: Logger
) => {
  const exportRoute = router.post({
    path: `${DASHBOARD_API_PATH}/_export`,
    summary: 'Export dashboards with their referenced objects',
    ...referencedObjectsRouteConfig,
    description: `${TECHNICAL_PREVIEW_NOTE}\n\nExports dashboards as the bodies the Dashboards API accepts on PUT, with the problems the export found. Import the response with \`POST ${DASHBOARD_API_PATH}/_import\`.`,
  });

  exportRoute.addVersion(
    {
      version: DASHBOARD_API_VERSION,
      validate: {
        request: {
          body: z.object({
            ids: z
              .array(savedObjectId())
              .min(1)
              .max(maxImportExportSize)
              .meta({ description: 'The IDs of the dashboards to export.' }),
          }),
        },
        response: {
          200: {
            body: () => exportReferencedObjectsResponseSchema,
            description: 'exported',
          },
          400: {
            description: 'invalid request, or a dashboard is missing or unreadable',
          },
          403: {
            description: 'forbidden',
          },
          404: {
            description: 'not found',
          },
        },
      },
    },
    async (ctx, req, res) =>
      telemetryHandler(req, { usageCounter }, async () => {
        const { core } = await ctx.resolve(['core']);
        if (!(await isExportReferencedObjectsEnabled(core.featureFlags))) {
          return res.notFound();
        }
        try {
          const [, { savedObjectsManagement }] = await getStartServices();
          const body = await savedObjectsManagement.exportReferencedObjects({
            request: req,
            client: core.savedObjects.client,
            roots: req.body.ids.map((id) => ({ type: DASHBOARD_SAVED_OBJECT_TYPE, id })),
          });
          return res.ok({ body });
        } catch (e) {
          if (e instanceof SavedObjectsExportError) {
            logRequest(logger, req, 'debug', e.message);
            return res.badRequest({ body: { message: e.message, attributes: e.attributes } });
          }
          return writeErrorHandler(e, res, logger, req);
        }
      })
  );
};
