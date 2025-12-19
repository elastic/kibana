/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { MessageFieldWithRole } from '@langchain/core/messages';
import type { CoreSetup } from '@kbn/core/server';
import { resolveConnectorId } from './utils/resolve_connector_id';
import { AiSummarizeStepCommonDefinition } from '../../../common/steps/ai';
import { createServerStepDefinition } from '../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../types';

/**
 * Builds a summarization prompt based on the input type and optional parameters
 */
export function buildModelInput(params: {
  input: unknown;
  instructions?: string[];
  maxLength?: number;
}): BaseLanguageModelInput {
  const { input, instructions, maxLength } = params;
  const inputType = typeof input === 'object' ? 'json' : 'text';
  let resolvedInput = input;

  if (inputType === 'json') {
    resolvedInput = JSON.stringify(input);
  }

  const modelInput: MessageFieldWithRole[] = [
    {
      role: 'system',
      content: `
You are a summarization system, that:
- Follows summary requirements if present provided by the user
- Respects additional instructions provided by the user
- Outputs summary for provided data
- Doesn't include anything additional to summary 
`,
    },
    {
      role: 'user',
      content: `
# Data to summarize:
\`\`\`${inputType}
${resolvedInput}
\`\`\`
# Requirements:  
`,
    },
  ];

  let requirementsPart = '';
  const summaryRequirements: string[] = [];

  if (typeof maxLength === 'number') {
    summaryRequirements.push(`Max length of summary must be ${maxLength} characters.`);
  }

  if (summaryRequirements.length) {
    requirementsPart += `
${summaryRequirements.map((req) => `- ${req}`).join('\n')}
`;
  }

  if (requirementsPart) {
    modelInput.push({
      role: 'user',
      content: requirementsPart,
    });
  }

  if (instructions?.length) {
    modelInput.push({
      role: 'user',
      content: `
# Additional instructions:
${instructions.map((text) => `- ${text}`).join('\n')}
        `,
    });
  }

  return modelInput;
}

export const aiSummarizeStepDefinition = (
  coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>
) =>
  createServerStepDefinition({
    ...AiSummarizeStepCommonDefinition,
    handler: async (context) => {
      const [, { inference }] = await coreSetup.getStartServices();

      const resolvedConnectorId = await resolveConnectorId(
        context.config['connector-id'],
        inference,
        context.contextManager.getFakeRequest()
      );

      const chatModel = await inference.getChatModel({
        connectorId: resolvedConnectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: {
          temperature: context.input.temperature,
          maxRetries: 0,
        },
      });

      const modelInput = buildModelInput({
        input: context.input.input,
        instructions: context.input.instructions,
        maxLength: context.input.maxLength,
      });

      const modelResponse = await chatModel.invoke(modelInput, {
        signal: context.abortSignal,
      });

      // Convert content to string if it's an array
      const content =
        typeof modelResponse.content === 'string'
          ? modelResponse.content
          : modelResponse.content.map((part) => ('text' in part ? part.text : '')).join('');

      return {
        output: {
          content,
          metadata: modelResponse.response_metadata,
        },
      };
    },
  });
