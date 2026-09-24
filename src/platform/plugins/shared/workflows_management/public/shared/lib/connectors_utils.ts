/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TASK_TYPE_BY_SUB_ACTION } from '@kbn/connector-schemas/inference/constants';
import type { HttpSetup } from '@kbn/core-http-browser';
import { loadConnectors } from '@kbn/inference-connectors';
import type { ConnectorIdSelectionHandler, ConnectorInstance } from '@kbn/workflows/types/v1';
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

export async function loadInferenceConnectorsForRegisteredSteps(
  http: HttpSetup
): Promise<Map<string, ConnectorInstance[]>> {
  const featureIds = new Set(
    stepSchemas.getAllRegisteredStepDefinitions().flatMap((definition) => {
      if (!('editorHandlers' in definition)) {
        return [];
      }
      const featureId =
        definition.editorHandlers?.config?.['connector-id']?.connectorIdSelection
          ?.inferenceFeatureId;
      return featureId ? [featureId] : [];
    })
  );

  return new Map(
    await Promise.all(
      [...featureIds].map(
        async (featureId) =>
          [
            featureId,
            (
              await loadConnectors({ http, featureId })
            ).map((connector) => ({
              id: connector.id,
              name: connector.name,
              connectorType: connector.actionTypeId,
              isPreconfigured: connector.isPreconfigured,
              isDeprecated: connector.isDeprecated || connector.isConnectorTypeDeprecated,
              isInferenceEndpoint: connector.isInferenceEndpoint,
              config:
                'config' in connector && typeof connector.config.taskType === 'string'
                  ? { taskType: connector.config.taskType }
                  : undefined,
            })),
          ] as const
      )
    )
  );
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

export function getInferenceConnectorTaskTypeFromSubAction(subAction: string): string | undefined {
  return TASK_TYPE_BY_SUB_ACTION[subAction as keyof typeof TASK_TYPE_BY_SUB_ACTION];
}
