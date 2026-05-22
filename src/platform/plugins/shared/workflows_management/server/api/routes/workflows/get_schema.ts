/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerGetSchemaRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/schema',
      access: 'public',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Get workflow JSON schema',
      description:
        'Retrieve the JSON schema used to validate workflow YAML definitions. The schema includes available step types based on the configured connectors in the current space.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/get_schema.yaml'),
        },
        validate: {
          request: {
            query: schema.object({
              loose: schema.boolean({
                meta: {
                  description:
                    'When true, returns a permissive schema that allows additional properties. When false, returns a strict schema for full validation.',
                },
              }),
            }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { loose } = request.query;
          const spaceId = spaces.getSpaceId(request);
          const jsonSchema = await api.getWorkflowJsonSchema({ loose }, spaceId, request);
          if (!jsonSchema) {
            return response.customError({
              statusCode: 500,
              body: { message: 'Error generating JSON schema' },
            });
          }
          return response.ok({ body: jsonSchema });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
