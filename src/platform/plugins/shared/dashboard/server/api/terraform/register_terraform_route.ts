/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { DashboardConverter, JsonObject } from '@kbn/as-code-dashboard-terraform';
import { logRequest } from '@kbn/as-code-utils';
import {
  DASHBOARD_INTERNAL_API_PATH,
  DASHBOARD_TERRAFORM_EXPORT_FLAG,
} from '../../../common/constants';
import type { DashboardTerraformResponseBody } from './types';

// Loaded on first use, not at startup; only a successful load is kept, so a failed one is retried.
let converter: Promise<DashboardConverter> | undefined;
const getConverter = (): Promise<DashboardConverter> => {
  converter ??= import('@kbn/as-code-dashboard-terraform')
    .then(async ({ createDashboardConverter, loadDashboardOas }) =>
      createDashboardConverter(await loadDashboardOas())
    )
    .catch((error) => {
      converter = undefined;
      throw error;
    });
  return converter;
};

/** Registers the internal, flag-gated route behind Export → Terraform. */
export function registerTerraformRoute(
  router: VersionedRouter<RequestHandlerContext>,
  logger: Logger
) {
  router
    .post({
      path: `${DASHBOARD_INTERNAL_API_PATH}/_terraform`,
      summary: 'Convert a dashboard to Terraform',
      security: {
        authz: {
          enabled: false,
          reason: 'Converts the request body only; reads no saved objects',
        },
      },
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({ dashboard: schema.object({}, { unknowns: 'allow' }) }),
          },
        },
      },
      async (ctx, req, res) => {
        const { featureFlags } = await ctx.core;
        if (!(await featureFlags.getBooleanValue(DASHBOARD_TERRAFORM_EXPORT_FLAG, false))) {
          return res.notFound();
        }
        const { DashboardConversionError, DASHBOARD_RESOURCE_TYPE, TERRAFORM_PROVIDER } =
          await import('@kbn/as-code-dashboard-terraform');
        try {
          const convert = await getConverter();
          const { body, droppedFields, skippedPanels } = convert(req.body.dashboard as JsonObject);
          const responseBody: DashboardTerraformResponseBody = {
            resource_type: DASHBOARD_RESOURCE_TYPE,
            body,
            dropped_fields: droppedFields,
            skipped_panels: skippedPanels,
            provider: { ...TERRAFORM_PROVIDER },
          };
          return res.ok({ body: responseBody });
        } catch (e) {
          if (e instanceof DashboardConversionError) {
            return res.badRequest({ body: { message: e.message } });
          }
          logRequest(logger, req, 'error', e.stack ?? e.message);
          throw e;
        }
      }
    );
}
