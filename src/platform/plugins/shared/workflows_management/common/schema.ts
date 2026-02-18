/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BaseConnectorContract,
  ConnectorContractUnion,
  ConnectorTypeInfo,
  StepPropertyHandler,
} from '@kbn/workflows';
import {
  generateYamlSchemaFromConnectors,
  getElasticsearchConnectors,
  getKibanaConnectors,
} from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

// Import connector schemas from the organized structure
import {
  ConnectorActionInputSchemas,
  ConnectorActionOutputSchemas,
  ConnectorInputSchemas,
  ConnectorOutputSchemas,
  ConnectorSpecsInputSchemas,
  staticConnectors,
} from './connector_action_schema';
// Import the singleton instance of StepSchemas
import { stepSchemas } from './step_schemas';

/**
 * Get parameter schema for a specific sub-action
 */
function getSubActionParamsSchema(actionTypeId: string, subActionName: string): z.ZodSchema {
  const schema = ConnectorInputSchemas.get(actionTypeId);
  if (schema) {
    return schema;
  }

  const actionsSchema = ConnectorActionInputSchemas.get(actionTypeId);
  if (actionsSchema) {
    const actionSchema = actionsSchema[subActionName];
    if (actionSchema) {
      return actionSchema;
    }
  }

  const connectorSpec = ConnectorSpecsInputSchemas.get(actionTypeId);
  if (connectorSpec) {
    const inputSchema = connectorSpec[subActionName];
    if (inputSchema) {
      return inputSchema as z.ZodSchema;
    }
  }

  // Generic fallback for unknown sub-actions
  return z.object({}).passthrough().default({});
}

/**
 * Get output schema for a specific sub-action
 */
function getSubActionOutputSchema(actionTypeId: string, subActionName: string): z.ZodSchema {
  const schema = ConnectorOutputSchemas.get(actionTypeId);
  if (schema) {
    return schema;
  }

  const actionsSchema = ConnectorActionOutputSchemas.get(actionTypeId);
  if (actionsSchema) {
    const actionSchema = actionsSchema[subActionName];
    if (actionSchema) {
      return actionSchema;
    }
  }

  // Generic fallback
  return z.any();
}

/**
 * Get registered step definitions from workflowExtensions, converted to BaseConnectorContract
 */
function getRegisteredStepDefinitions(): BaseConnectorContract[] {
  return stepSchemas
    .getAllRegisteredStepDefinitions()
    .map((stepDefinition): BaseConnectorContract => {
      const definition = {
        type: stepDefinition.id,
        paramsSchema: stepDefinition.inputSchema,
        outputSchema: stepDefinition.outputSchema,
        configSchema: stepDefinition.configSchema,
        summary: null,
        description: null,
      };

      if (stepSchemas.isPublicStepDefinition(stepDefinition)) {
        // Only public step definitions have documentation and examples
        return {
          ...definition,
          description: stepDefinition.label, // Short title-like text
          summary: stepDefinition.description ?? null, // Explanation of the step behavior
          documentation: stepDefinition.documentation?.url,
          examples: stepDefinition.documentation?.examples
            ? { snippet: stepDefinition.documentation?.examples.join('\n') }
            : undefined,
          editorHandlers: stepDefinition.editorHandlers,
        };
      }
      return definition;
    });
}

/**
 * Convert dynamic connector data from actions client to ConnectorContract format
 * Internal implementation - use exported convertDynamicConnectorsToContracts() instead
 */
function convertDynamicConnectorsToContractsInternal(
  connectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  const connectorContracts: ConnectorContractUnion[] = [];
  Object.values(connectorTypes).forEach((connectorType) => {
    try {
      const connectorTypeName = connectorType.actionTypeId.replace(/^\./, '');
      // If the connector has sub-actions, create separate contracts for each sub-action
      if (connectorType.subActions && connectorType.subActions.length > 0) {
        connectorType.subActions.forEach((subAction) => {
          // Create type name: actionTypeId.subActionName (e.g., "inference.completion")
          const subActionType = `${connectorTypeName}.${subAction.name}`;

          const paramsSchema = getSubActionParamsSchema(connectorType.actionTypeId, subAction.name);
          const outputSchema = getSubActionOutputSchema(connectorType.actionTypeId, subAction.name);

          connectorContracts.push({
            actionTypeId: connectorType.actionTypeId,
            type: subActionType,
            summary: subAction.displayName,
            paramsSchema,
            hasConnectorId: 'required',
            outputSchema,
            description: `${connectorType.displayName} - ${subAction.displayName}`,
            instances: connectorType.instances,
          });
        });
      } else {
        // Fallback: create a generic connector contract if no sub-actions
        // Try to get the proper schema for this connector type
        const paramsSchema = getSubActionParamsSchema(connectorType.actionTypeId, '');
        const outputSchema = getSubActionOutputSchema(connectorType.actionTypeId, '');

        connectorContracts.push({
          actionTypeId: connectorType.actionTypeId,
          type: connectorTypeName,
          summary: connectorType.displayName,
          paramsSchema,
          hasConnectorId: 'required',
          outputSchema,
          description: `${connectorType.displayName} connector`,
          instances: connectorType.instances,
        });
      }
    } catch (error) {
      // console.warn(`Error processing connector type ${connectorType.actionTypeId}:`, error);
      // Return a basic connector contract as fallback
      connectorContracts.push({
        actionTypeId: connectorType.actionTypeId,
        type: connectorType.actionTypeId,
        summary: connectorType.displayName,
        paramsSchema: z.any(),
        hasConnectorId: 'required',
        outputSchema: z.any(),
        description: `${connectorType.displayName || connectorType.actionTypeId} connector`,
        instances: connectorType.instances,
      });
    }
  });

  return connectorContracts;
}

// Export types for schema results
export type WorkflowZodSchemaType = z.infer<ReturnType<typeof getWorkflowZodSchema>>;
export type WorkflowZodSchemaLooseType = z.infer<ReturnType<typeof getWorkflowZodSchemaLoose>>;

// Legacy exports for backward compatibility - these will be deprecated
// TODO: Remove these once all consumers are updated to use the lazy-loaded versions
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(staticConnectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(
  staticConnectors,
  [],
  true
);

/**
 * Combine static connectors with dynamic Elasticsearch and Kibana connectors
 * Internal implementation - use exported getAllConnectors() instead
 */
export function getAllConnectorsInternal(): ConnectorContractUnion[] {
  // Return cached connectors if available
  const cached = stepSchemas.getAllConnectorsCache();
  if (cached !== null) {
    return cached;
  }

  // Get registered step definitions if workflowExtensions is initialized
  const registeredStepDefinitions = getRegisteredStepDefinitions();

  // Initialize cache with static and generated connectors
  const elasticsearchConnectors = getElasticsearchConnectors();
  const kibanaConnectors = getKibanaConnectors();
  const allConnectors = [
    ...staticConnectors,
    ...elasticsearchConnectors,
    ...kibanaConnectors,
    ...registeredStepDefinitions,
  ];

  // Update cache
  stepSchemas.setAllConnectorsCache(allConnectors);
  const mapCache = new Map(allConnectors.map((c) => [c.type, c]));
  stepSchemas.setAllConnectorsMapCache(mapCache);

  return allConnectors;
}

/**
 * Get all connectors including dynamic ones from actions client
 * Internal implementation - use exported getAllConnectorsWithDynamic() instead
 */
function getAllConnectorsWithDynamicInternal(
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  const stepDefinitions = getAllConnectorsInternal();

  // Graceful fallback if dynamic connectors are not available
  if (!dynamicConnectorTypes || Object.keys(dynamicConnectorTypes).length === 0) {
    return stepDefinitions;
  }

  try {
    const dynamicConnectors = convertDynamicConnectorsToContractsInternal(dynamicConnectorTypes);

    // Filter out any duplicates (dynamic connectors override static ones with same type)
    const staticConnectorTypes = new Set(stepDefinitions.map((c) => c.type));
    const uniqueDynamicConnectors = dynamicConnectors.filter(
      (c) => !staticConnectorTypes.has(c.type)
    );

    // Connectors added successfully without logging noise
    return [...stepDefinitions, ...uniqueDynamicConnectors];
  } catch (error) {
    return stepDefinitions;
  }
}

// Export convenience functions that use the singleton
// These maintain backward compatibility while using the singleton internally
export function convertDynamicConnectorsToContracts(
  connectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  return convertDynamicConnectorsToContractsInternal(connectorTypes);
}

export function getCachedAllConnectorsMap(): Map<string, ConnectorContractUnion> | null {
  return stepSchemas.getAllConnectorsMapCache();
}

export function setCachedAllConnectorsMap(_allConnectors: ConnectorContractUnion[]): void {
  // This function is kept for backward compatibility but delegates to the singleton
  // Note: The singleton manages its own cache, so this may not be needed
  // We can't directly set the cache, but we can ensure connectors are loaded
  getAllConnectorsInternal();
}

export function addDynamicConnectorsToCache(
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
): void {
  // Create a simple hash of the connector types to detect changes
  const currentHash = JSON.stringify(Object.keys(dynamicConnectorTypes).sort());

  // Skip processing if the connector types haven't changed
  const lastHash = stepSchemas.getLastProcessedConnectorTypesHash();
  const cachedDynamicTypes = stepSchemas.getDynamicConnectorTypesCache();
  if (lastHash === currentHash && cachedDynamicTypes !== null) {
    return;
  }

  // Store the raw dynamic connector types for completion provider access
  stepSchemas.setDynamicConnectorTypesCache(dynamicConnectorTypes);
  stepSchemas.setLastProcessedConnectorTypesHash(currentHash);

  // Get base connectors if cache is empty
  if (stepSchemas.getAllConnectorsCache() === null) {
    // Get registered step definitions
    const registeredStepDefinitions = getRegisteredStepDefinitions();
    // Get base connectors
    const elasticsearchConnectors = getElasticsearchConnectors();
    const kibanaConnectors = getKibanaConnectors();
    const allConnectors = [
      ...staticConnectors,
      ...elasticsearchConnectors,
      ...kibanaConnectors,
      ...registeredStepDefinitions,
    ];
    stepSchemas.setAllConnectorsCache(allConnectors);
  }

  // Convert dynamic connectors to ConnectorContract format
  const dynamicConnectors = convertDynamicConnectorsToContractsInternal(dynamicConnectorTypes);

  // Get existing connector types to avoid duplicates
  const allConnectorsCache = stepSchemas.getAllConnectorsCache();
  if (allConnectorsCache === null) {
    return;
  }

  const existingTypes = new Set(allConnectorsCache.map((c) => c.type));

  // Add only new dynamic connectors
  const newDynamicConnectors = dynamicConnectors.filter((c) => !existingTypes.has(c.type));

  if (newDynamicConnectors.length > 0) {
    const updatedCache = [...allConnectorsCache, ...newDynamicConnectors];
    stepSchemas.setAllConnectorsCache(updatedCache);
    const mapCache = new Map(updatedCache.map((c) => [c.type, c]));
    stepSchemas.setAllConnectorsMapCache(mapCache);
  }
}

export function getCachedDynamicConnectorTypes(): Record<string, ConnectorTypeInfo> | null {
  return stepSchemas.getDynamicConnectorTypesCache();
}

export function getAllConnectors(): ConnectorContractUnion[] {
  return getAllConnectorsInternal();
}

export function getAllConnectorsWithDynamic(
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  return getAllConnectorsWithDynamicInternal(dynamicConnectorTypes);
}

export const getWorkflowZodSchema = (
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>,
  registeredTriggerIds: string[] = []
): z.ZodType => {
  const allConnectors = getAllConnectorsWithDynamicInternal(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors, registeredTriggerIds);
};

export const getWorkflowZodSchemaLoose = (
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo> = {}
): z.ZodType => {
  const allConnectors = getAllConnectorsWithDynamicInternal(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors, [], true);
};

export const getPropertyHandler = (
  stepType: string,
  scope: 'config' | 'input',
  propertyKey: string
): StepPropertyHandler | null => {
  const connector = stepSchemas.getAllConnectorsMapCache()?.get(stepType);
  return connector?.editorHandlers?.[scope]?.[propertyKey] ?? null;
};
