/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { resolveConnectorId } from './resolve_connector_id';
import { AiPromptStepCommonDefinition } from '../../../common/steps/ai';
import { createServerStepDefinition } from '../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../types';

export const aiPromptStepDefinition = (
  coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>
) =>
  createServerStepDefinition({
    ...AiPromptStepCommonDefinition,
    handler: async (context) => {
      const [, { inference }] = await coreSetup.getStartServices();

      const connectorId = await resolveConnectorId(
        context.input.connectorId,
        inference,
        context.contextManager.getFakeRequest()
      );

      const chatModel = await inference.getChatModel({
        connectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: {
          temperature: context.input.temperature,
        },
      });

      const modelInput = [
        ...(context.input.outputSchema
          ? [getStructuredOutputPrompt(context.input.outputSchema)]
          : []),
        {
          role: 'user',
          content: context.input.prompt,
        },
      ];

      const response = await chatModel.invoke(modelInput, {
        signal: context.abortSignal,
      });

      return {
        output: {
          content: context.input.outputSchema
            ? JSON.parse(response.content as string)
            : response.content,
          response_metadata: response.response_metadata,
        },
      };
    },
  });

function getStructuredOutputPrompt(outputSchema: unknown) {
  return {
    role: 'system',
    content: `
You are an assistant that responds strictly in JSON format.

Rules:
1. Your entire response MUST be a single valid JSON object.
2. The JSON MUST conform to the schema provided below.
3. Do not include explanations, comments, markdown, code fences, or text outside the JSON.
4. Output RAW JSON only — no formatting other than what makes it valid JSON.

JSON schema:
\`\`\`json
${JSON.stringify(outputSchema)}
\`\`\`
`,
  };
}
