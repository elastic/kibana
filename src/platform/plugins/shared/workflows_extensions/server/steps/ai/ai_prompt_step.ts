/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { resolveConnectorId } from './resolve_connector_id';
// TODO: convertJsonSchemaToZod is currently a temporary copy. Once the PR is merged in inference plugin, we should import from there.
import { convertJsonSchemaToZod } from './temp_json_schema_to_zod';
import { AiPromptStepCommonDefinition } from '../../../common/steps/ai';
import { createServerStepDefinition } from '../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../types';

export const aiPromptStepDefinition = (
  coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>
) =>
  createServerStepDefinition({
    ...AiPromptStepCommonDefinition,
    handler: async (context) => {
      const [, { actions, inference }] = await coreSetup.getStartServices();

      const connectorId = await resolveConnectorId(
        context.input.connectorId,
        actions,
        context.contextManager.getFakeRequest()
      );

      const chatModel = await inference.getChatModel({
        connectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: {},
      });

      if (!context.input.outputSchema) {
        const response = await chatModel.invoke([{ role: 'user', content: context.input.input }]);
        return {
          output: response,
        };
      }

      const modelInput = [
        {
          role: 'system',
          content:
            'You are a helpful assistant that only responds in the structured format that is requested.',
        },
        { role: 'user', content: context.input.input },
      ];

      // TODO: convertJsonSchemaToZod is currently a temporary copy. Once the PR is merged in inference plugin, we should import from there.
      const zodSchema = z.object({
        response: convertJsonSchemaToZod(context.input.outputSchema), // Workaround, because inference plugin refuses z.array, but having array response is valid use case
      });

      const output = await chatModel.withStructuredOutput(zodSchema).invoke(modelInput);

      return {
        output: output.response,
      };
    },
  });
