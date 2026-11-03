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
import type { DashboardConverter, JsonObject, JsonValue } from '@kbn/as-code-dashboard-terraform';
import { MAX_TITLE_LENGTH } from '@kbn/as-code-shared-schemas';
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

/** The largest request body the route accepts, with headroom for the defaults sanitizing adds. */
export const MAX_TERRAFORM_REQUEST_BYTES = 2 * 1024 * 1024;

// Panel types point at the mapping that failed without logging the dashboard's own text.
const panelTypes = (list: JsonValue | undefined): string[] =>
  Array.isArray(list)
    ? list.flatMap((panel) => {
        if (!panel || typeof panel !== 'object' || Array.isArray(panel)) return ['?'];
        if (typeof panel.type === 'string') return [panel.type];
        return Array.isArray(panel.panels) ? ['section', ...panelTypes(panel.panels)] : ['?'];
      })
    : [];

const describeDashboard = ({ panels, pinned_panels: pinnedPanels }: JsonObject): string =>
  `panels [${panelTypes(panels).join(', ')}], pinned panels [${panelTypes(pinnedPanels).join(
    ', '
  )}]`;

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
      options: { body: { maxBytes: MAX_TERRAFORM_REQUEST_BYTES } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              dashboard: schema.object(
                // The title names the Terraform resource.
                { title: schema.maybe(schema.string({ maxLength: MAX_TITLE_LENGTH })) },
                { unknowns: 'allow' }
              ),
            }),
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
        const dashboard = req.body.dashboard as JsonObject;
        try {
          const convert = await getConverter();
          const { body, droppedFields, skippedPanels, partialPanels, jsonPanels } =
            convert(dashboard);
          const responseBody: DashboardTerraformResponseBody = {
            resource_type: DASHBOARD_RESOURCE_TYPE,
            body,
            dropped_fields: droppedFields,
            skipped_panels: skippedPanels,
            partial_panels: partialPanels.map(({ droppedFields: dropped, ...panel }) => ({
              ...panel,
              dropped_fields: dropped,
            })),
            json_panels: jsonPanels,
            provider: { ...TERRAFORM_PROVIDER },
          };
          return res.ok({ body: responseBody });
        } catch (e) {
          if (e instanceof DashboardConversionError) {
            return res.badRequest({ body: { message: e.message } });
          }
          logRequest(
            logger,
            req,
            'error',
            `Terraform conversion failed for a dashboard with ${describeDashboard(dashboard)}: ${
              e.stack ?? e.message
            }`
          );
          throw e;
        }
      }
    );
}
