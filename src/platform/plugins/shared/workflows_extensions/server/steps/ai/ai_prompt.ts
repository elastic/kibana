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

// Using createServerStepDefinition for automatically inferring input and output types from the schemas in setVarStepCommonDefinition
// No need to explicitly specify SetVarStepInput and SetVarStepOutput types
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

      return {
        output: {
          response: 'This is a placeholder response from the AI Prompt step.',
        } as any,
      };
    },
  });
