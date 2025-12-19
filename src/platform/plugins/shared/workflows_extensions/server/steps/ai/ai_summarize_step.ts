/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { resolveConnectorId } from './utils/resolve_connector_id';
import { AiSummarizeStepCommonDefinition } from '../../../common/steps/ai';
import { createServerStepDefinition } from '../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../types';

/**
 * Builds a summarization prompt based on the input type and optional parameters
 */
function buildSummarizationPrompt(params: {
  input: string | unknown[] | Record<string, unknown>;
  instructions?: string;
  maxLength?: number;
}): string {
  const { input, instructions, maxLength } = params;

  // Convert input to string format
  let contentToSummarize: string;
  if (typeof input === 'string') {
    contentToSummarize = input;
  } else {
    contentToSummarize = JSON.stringify(input, null, 2);
  }

  // Build the prompt
  let prompt = 'Please provide a concise summary of the following content:\n\n';
  prompt += contentToSummarize;
  prompt += '\n\n';

  // Add instructions if provided
  if (instructions) {
    prompt += `Additional instructions: ${instructions}\n`;
  }

  // Add length constraint if provided
  if (maxLength) {
    prompt += `Please keep the summary under ${maxLength} tokens.\n`;
  }

  return prompt;
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

      // Build the summarization prompt
      const prompt = buildSummarizationPrompt({
        input: context.input.input,
        instructions: context.input.instructions,
        maxLength: context.input.maxLength,
      });

      const modelInput = [
        {
          role: 'user',
          content: prompt,
        },
      ];

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
