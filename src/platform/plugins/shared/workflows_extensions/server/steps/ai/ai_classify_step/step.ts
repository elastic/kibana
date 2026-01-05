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
import {
  buildClassificationRequestPart,
  buildDataPart,
  buildInstructionsPart,
  buildSystemPart,
} from './build_prompts';
import { AiClassifyStepCommonDefinition } from '../../../../common/steps/ai';
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

function validateClassificationResponse(
  response: ClassificationResponse,
  categories: string[],
  allowMultipleCategories: boolean,
  fallbackCategory?: string
): { category: string; rationale?: string } | { categories: string[]; rationale?: string } {
  if (allowMultipleCategories) {
    if (!response.categories || !Array.isArray(response.categories)) {
      throw new Error('Model response must include a "categories" array');
    }

    // Validate all categories are in the allowed list or fallback
    const invalidCategories = response.categories.filter(
      (cat) => !categories.includes(cat) && cat !== fallbackCategory
    );
    if (invalidCategories.length > 0) {
      throw new Error(
        `Model returned invalid categories: ${invalidCategories.join(
          ', '
        )}. Must be one of: ${categories.join(', ')}${
          fallbackCategory ? `, ${fallbackCategory}` : ''
        }`
      );
    }

    return {
      categories: response.categories,
      rationale: response.rationale,
    };
  } else {
    if (!response.category) {
      throw new Error('Model response must include a "category" field');
    }

    // Validate category is in the allowed list or fallback
    if (!categories.includes(response.category) && response.category !== fallbackCategory) {
      throw new Error(
        `Model returned invalid category: ${response.category}. Must be one of: ${categories.join(
          ', '
        )}${fallbackCategory ? `, ${fallbackCategory}` : ''}`
      );
    }

    return {
      category: response.category,
      rationale: response.rationale,
    };
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

      const modelInput: MessageFieldWithRole[] = [
        ...buildSystemPart({
          categories,
          allowMultipleCategories,
          fallbackCategory,
          includeRationale,
        }),
        ...buildDataPart(input),
        ...buildInstructionsPart(instructions),
        ...buildClassificationRequestPart(),
      ];

      let lastError: Error | undefined;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const modelResponse = await chatModel.invoke(modelInput, {
            signal: context.abortSignal,
          });

          // Convert content to string if it's an array
          const content =
            typeof modelResponse.content === 'string'
              ? modelResponse.content
              : modelResponse.content.map((part) => ('text' in part ? part.text : '')).join('');

          // Parse and validate the response
          const parsedResponse = parseModelResponse(content);
          const validatedResponse = validateClassificationResponse(
            parsedResponse,
            categories,
            allowMultipleCategories,
            fallbackCategory
          );

          return {
            output: validatedResponse,
          };
        } catch (error) {
          lastError = error;

          // If this isn't the last attempt, add a correction prompt
          if (attempt < maxAttempts) {
            modelInput.push(
              {
                role: 'assistant',
                content: String(error.message),
              },
              {
                role: 'user',
                content: `Your previous response was invalid. ${error.message}. Please try again and return ONLY valid JSON matching the exact format specified.`,
              }
            );
          }
        }
      }

      // If all retries failed, throw the last error
      throw new Error(
        `Failed to classify after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
      );
    },
  });
