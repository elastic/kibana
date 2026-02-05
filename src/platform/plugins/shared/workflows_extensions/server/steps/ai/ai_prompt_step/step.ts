/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { AiPromptStepCommonDefinition } from '../../../../common/steps/ai';
import { createServerStepDefinition } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

export const aiPromptStepDefinition = (
  coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>
) =>
  createServerStepDefinition({
    ...AiPromptStepCommonDefinition,
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
      const modelInput = [
        ...(context.input.systemPrompt
          ? [{ role: 'system', content: context.input.systemPrompt }]
          : []),
        {
          role: 'user',
          content: context.input.prompt,
        },
      ];

      if (context.input.schema) {
        const runnable = chatModel.withStructuredOutput(
          {
            type: 'object',
            properties: {
              // withStructuredOutput fails if outputSchema is not an object.
              // for example, if the user expects an array, we wrap it into an object here
              // and then unwrap it below
              response: context.input.schema,
            },
          },
          {
            name: 'extract_structured_response',
            includeRaw: true,
            method: 'jsonMode',
          }
        );

        const invocationResult = await runnable.invoke(modelInput, {
          signal: context.abortSignal,
        });
        return {
          // We modify the output to match the expected schema
          // For now, structured output flow does not output response_metadata,
          // so we only return the content here, but looking ahead we might have response_metadata returned,
          // so we keep the same output structure with potential response_metadata addition in the future.
          output: {
            content: invocationResult.parsed.response,
            metadata: invocationResult.raw.response_metadata,
          },
        };
      }

      const invocationResult = await chatModel.invoke(modelInput, {
        signal: context.abortSignal,
      });

      return {
        output: {
          content: invocationResult.content,
          metadata: invocationResult.response_metadata,
        },
      };
    },
  });
