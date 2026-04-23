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
  buildDataPart,
  buildInstructionsPart,
  buildRequirementsPart,
  buildSystemPart,
} from './build_prompts';
import { AiSummarizeStepCommonDefinition } from '../../../../common/steps/ai';
import { createServerStepDefinition } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

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

      const modelInput: MessageFieldWithRole[] = [
        ...buildSystemPart(),
        ...buildDataPart(context.input.input),
        ...buildRequirementsPart({ maxLength: context.input.maxLength }),
        ...buildInstructionsPart(context.input.instructions),
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
