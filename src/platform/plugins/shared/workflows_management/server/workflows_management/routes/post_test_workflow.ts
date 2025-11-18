/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { parseYamlToJSONWithoutValidation } from '../../../common/lib/yaml/parse_workflow_yaml_to_json_without_validation';
import { preprocessAlertInputs } from '../utils/preprocess_alert_inputs';

export function registerPostTestWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/test',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTE_SECURITY,
      validate: {
        body: schema.object({
          inputs: schema.recordOf(schema.string(), schema.any()),
          workflowYaml: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        let processedInputs = request.body.inputs;
        const parsedYaml = parseYamlToJSONWithoutValidation(request.body.workflowYaml);
        const hasAlertTrigger =
          parsedYaml.success &&
          Array.isArray(parsedYaml.json.triggers) &&
          parsedYaml.json.triggers.some(
            (trigger: unknown) =>
              typeof trigger === 'object' &&
              trigger !== null &&
              'type' in trigger &&
              trigger.type === 'alert'
          );
        if (hasAlertTrigger) {
          try {
            processedInputs = await preprocessAlertInputs(
              request.body.inputs,
              spaceId,
              esClient,
              logger,
              'test'
            );
          } catch (preprocessError) {
            logger.debug(
              `Alert preprocessing failed, using original inputs: ${
                preprocessError instanceof Error ? preprocessError.message : String(preprocessError)
              }`
            );
          }
        }

        const workflowExecutionId = await api.testWorkflow(
          request.body.workflowYaml,
          processedInputs,
          spaceId,
          request
        );

        return response.ok({
          body: {
            workflowExecutionId,
          },
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
