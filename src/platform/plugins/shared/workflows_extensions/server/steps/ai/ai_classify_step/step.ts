/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MessageFieldWithRole } from '@langchain/core/messages';
import type { CoreSetup } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import {
  buildClassificationRequestPart,
  buildDataPart,
  buildInstructionsPart,
  buildSystemPart,
} from './build_prompts';
import {
  AiClassifyStepCommonDefinition,
  buildStructuredOutputSchema,
} from '../../../../common/steps/ai';
import { createServerStepDefinition } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

interface ClassificationResponse {
  category?: string;
  categories?: string[];
  rationale?: string;
}

function parseModelResponse(content: string): ClassificationResponse {
  // Remove markdown code blocks if present
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleanContent);
  } catch (error) {
    throw new Error(`Failed to parse model response as JSON: ${error.message}`);
  }
}

function validateModelResponse(response: unknown, schema: z.ZodType): void {
  const safeParseResult = schema.safeParse(response);

  if (safeParseResult.error) {
    throw new Error(`Model returned invalid JSON. Message: ${safeParseResult.error}`);
  }
}

export const aiClassifyStepDefinition = (
  coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>
) =>
  createServerStepDefinition({
    ...AiClassifyStepCommonDefinition,
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
          maxRetries: 2, // Allow retries for validation failures
        },
      });

      const {
        input,
        categories,
        instructions,
        allowMultipleCategories = false,
        fallbackCategory,
        includeRationale = false,
      } = context.input;
      const structuredOutputSchema = buildStructuredOutputSchema(context.input);
      const jsonSchema = z.toJSONSchema(structuredOutputSchema);
      const modelInput: MessageFieldWithRole[] = [
        ...buildSystemPart({
          categories,
          allowMultipleCategories,
          fallbackCategory,
          includeRationale,
          jsonSchema,
        }),
        ...buildDataPart(input),
        ...buildInstructionsPart(instructions),
        ...buildClassificationRequestPart(),
      ];

      const runnable = chatModel;

      const modelResponse = await runnable.invoke(modelInput, {
        signal: context.abortSignal,
      });

      const parsedResponse = parseModelResponse(modelResponse.content as string);
      validateModelResponse(parsedResponse, structuredOutputSchema);

      return {
        output: parsedResponse,
      };
    },
  });
