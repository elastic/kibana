/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { logRequest, writeErrorHandler } from '@kbn/as-code-utils';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { CoreSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsImportError } from '@kbn/core/server';
import {
  getImportReferencedObjectsRequestSchema,
  importReferencedObjectsResponseSchema,
} from '@kbn/saved-objects-management-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '../../../common/constants';
import type { StartDeps } from '../../plugin';
import type { DashboardPluginStart } from '../../types';
import {
  isExportReferencedObjectsEnabled,
  referencedObjectsRouteConfig,
  TECHNICAL_PREVIEW_NOTE,
} from './route_config';

export const registerImportRoute = (
  router: VersionedRouter<RequestHandlerContext>,
  getStartServices: CoreSetup<StartDeps, DashboardPluginStart>['getStartServices'],
  usageCounter: UsageCounter | undefined,
  {
    maxImportExportSize,
    maxImportPayloadBytes,
  }: { maxImportExportSize: number; maxImportPayloadBytes: number },
  logger: Logger
) => {
  const importRoute = router.post({
    path: `${DASHBOARD_API_PATH}/_import`,
    summary: 'Import dashboards with their referenced objects',
    ...referencedObjectsRouteConfig,
    options: {
      ...referencedObjectsRouteConfig.options,
      body: { maxBytes: maxImportPayloadBytes },
    },
    description: `${TECHNICAL_PREVIEW_NOTE}\n\nImports the objects of a \`POST ${DASHBOARD_API_PATH}/_export\` response, validating each body against its type's public API schema, and returns a result per object.`,
  });

  importRoute.addVersion(
    {
      version: DASHBOARD_API_VERSION,
      validate: {
        request: {
          body: getImportReferencedObjectsRequestSchema(maxImportExportSize),
        },
        response: {
          200: {
            body: () => importReferencedObjectsResponseSchema,
            description: 'imported',
          },
          400: {
            description: 'invalid request',
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
          const body = await savedObjectsManagement.importReferencedObjects({
            client: core.savedObjects.client,
            ...req.body,
          });
          return res.ok({ body });
        } catch (e) {
          if (e instanceof SavedObjectsImportError) {
            logRequest(logger, req, 'debug', e.message);
            return res.badRequest({ body: { message: e.message, attributes: e.attributes } });
          }
          return writeErrorHandler(e, res, logger, req);
        }
      })
  );
};
