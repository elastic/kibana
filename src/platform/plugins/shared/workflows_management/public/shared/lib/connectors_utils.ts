/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorIdSelectionHandler } from '@kbn/workflows/types/v1';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { stepSchemas } from '../../../common/step_schemas';

export function getCustomStepConnectorIdSelectionHandler(
  stepType: string
): ConnectorIdSelectionHandler | undefined {
  const customStepDefinition = stepSchemas.getStepDefinition(stepType);
  if (customStepDefinition) {
    const editorHandlers = (customStepDefinition as PublicStepDefinition).editorHandlers;
    return editorHandlers?.config?.['connector-id']?.connectorIdSelection;
  }
  return undefined;
}

export function getConnectorTypesFromStepType(stepType: string): string[] {
  const customStepSelectionHandler = getCustomStepConnectorIdSelectionHandler(stepType);
  return customStepSelectionHandler?.connectorTypes ?? [stepType];
}

export function isCreateConnectorEnabledForStepType(stepType: string): boolean {
  const customStepSelectionHandler = getCustomStepConnectorIdSelectionHandler(stepType);
  if (!customStepSelectionHandler) {
    // If no customStepSelectionHandler defined (regular connector step), the default is to enable creation
    return true;
  }
  // If customStepSelectionHandler defined (custom step with connector-id property), the default is to disable connector creation, unless enableCreation is explicitly set to true
  return customStepSelectionHandler.enableCreation ?? false;
}

/**
 * Mapping of sub_action to task_type for inference connectors.
 * This maps each executable sub-action to its corresponding inference endpoint task type.
 */
export const TASK_TYPE_BY_SUB_ACTION: Record<string, string> = {
  unified_completion: 'chat_completion',
  unified_completion_stream: 'chat_completion',
  unified_completion_async_iterator: 'chat_completion',
  completion: 'completion',
  completion_stream: 'completion',
  rerank: 'rerank',
  text_embedding: 'text_embedding',
  sparse_embedding: 'sparse_embedding',
};

export function getInferenceConnectorTaskTypeFromSubAction(subAction: string): string | undefined {
  return TASK_TYPE_BY_SUB_ACTION[subAction];
}
