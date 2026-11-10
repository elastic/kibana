/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { systemConnectorActionRefPrefix } from '@kbn/alerting-plugin/common';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { schema } from '@kbn/config-schema';
import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';
import { ConnectorTypeId } from '../../../connectors/workflows';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const MAX_LINKED_RULES = 10;

const buildLinkedRulesFilter = (workflowIds: string[]): string => {
  const ids = workflowIds.map((id) => `"${escapeQuotes(id)}"`).join(' or ');
  return `alert.attributes.actions:{ actionRef: "${systemConnectorActionRefPrefix}system-connector-${ConnectorTypeId}" and params.subActionParams.workflowId: (${ids}) }`;
};

export function registerGetLinkedRulesRoute(deps: RouteDependencies) {
  const { router } = deps;
  router.versioned
    .post({
      path: '/internal/workflows/_linked_rules',
      access: 'internal',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Get rules linked to workflows',
      description: 'Retrieve the alerting rules that run any of the given workflows.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            body: schema.object({
              ids: schema.arrayOf(schema.string({ maxLength: 255 }), {
                minSize: 1,
                maxSize: 500,
              }),
            }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const filter = buildLinkedRulesFilter(request.body.ids);
          const rulesClient = await (await context.alerting).getRulesClient();
          // Counts every linked rule in the space, also the ones the user cannot read, so the
          // client can warn about them. Only the count leaves this handler.
          const unsecuredSavedObjectsClient = (await context.core).savedObjects.getClient({
            includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
            excludedExtensions: [SECURITY_EXTENSION_ID],
          });
          const [{ total, data }, { total: totalInSpace }] = await Promise.all([
            rulesClient.find({
              options: {
                filter,
                page: 1,
                perPage: MAX_LINKED_RULES,
                sortField: 'name',
                sortOrder: 'asc',
              },
            }),
            unsecuredSavedObjectsClient.find({ type: RULE_SAVED_OBJECT_TYPE, filter, perPage: 0 }),
          ]);
          return response.ok({
            body: {
              total,
              hiddenTotal: Math.max(totalInSpace - total, 0),
              rules: data.map(({ id, name, alertTypeId }) => ({
                id,
                name,
                ruleTypeId: alertTypeId,
              })),
            },
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
