/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion, ConnectorTypeInfo } from '@kbn/workflows';
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
 * Convert dynamic connector data from actions client to ConnectorContract format
 */
export function convertDynamicConnectorsToContracts(
  connectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  const connectorContracts: ConnectorContractUnion[] = [];

  Object.values(connectorTypes).forEach((connectorType) => {
    try {
      // Create connector ID schema with available instances
      // If no instances exist, use a generic string schema
      const connectorIdSchema =
        connectorType.instances.length > 0
          ? z.enum([
              connectorType.instances[0].id,
              ...connectorType.instances.slice(1).map((i) => i.id),
            ] as [string, ...string[]])
          : z.string();

      const connectorTypeName = connectorType.actionTypeId.replace(/^\./, '');
      // If the connector has sub-actions, create separate contracts for each sub-action
      if (connectorType.subActions && connectorType.subActions.length > 0) {
        connectorType.subActions.forEach((subAction) => {
          // Create type name: actionTypeId.subActionName (e.g., "inference.completion")
          const subActionType = `${connectorTypeName}.${subAction.name}`;

          const paramsSchema = getSubActionParamsSchema(connectorType.actionTypeId, subAction.name);
          const outputSchema = getSubActionOutputSchema(connectorType.actionTypeId, subAction.name);

          connectorContracts.push({
            connectorGroup: 'dynamic',
            actionTypeId: connectorType.actionTypeId,
            type: subActionType,
            summary: subAction.displayName,
            paramsSchema,
            connectorIdRequired: true,
            connectorId: connectorIdSchema,
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
          connectorGroup: 'dynamic',
          actionTypeId: connectorType.actionTypeId,
          type: connectorTypeName,
          summary: connectorType.displayName,
          paramsSchema,
          connectorIdRequired: true,
          connectorId: connectorIdSchema,
          outputSchema,
          description: `${connectorType.displayName} connector`,
          instances: connectorType.instances,
        });
      }
    } catch (error) {
      // console.warn(`Error processing connector type ${connectorType.actionTypeId}:`, error);
      // Return a basic connector contract as fallback
      connectorContracts.push({
        connectorGroup: 'dynamic',
        actionTypeId: connectorType.actionTypeId,
        type: connectorType.actionTypeId,
        summary: connectorType.displayName,
        paramsSchema: z.any(),
        connectorIdRequired: true,
        connectorId: z.string(),
        outputSchema: z.any(),
        description: `${connectorType.displayName || connectorType.actionTypeId} connector`,
        instances: connectorType.instances,
      });
    }
  });

  return connectorContracts;
}

// Global cache for all connectors (static + generated + dynamic)
let allConnectorsCache: ConnectorContractUnion[] | null = null;

let allConnectorsMapCache: Map<string, ConnectorContractUnion> | null = null;

// Global cache for dynamic connector types (with instances)
let dynamicConnectorTypesCache: Record<string, ConnectorTypeInfo> | null = null;

// Track the last processed connector types to avoid unnecessary re-processing
let lastProcessedConnectorTypesHash: string | null = null;

export function getCachedAllConnectorsMap(): Map<string, ConnectorContractUnion> | null {
  return allConnectorsMapCache;
}

export function setCachedAllConnectorsMap(allConnectors: ConnectorContractUnion[]) {
  allConnectorsMapCache = new Map(allConnectors.map((c) => [c.type, c]));
}

/**
 * Add dynamic connectors to the global cache
 * Call this when dynamic connector data is fetched from the API
 */
export function addDynamicConnectorsToCache(
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
) {
  // Create a simple hash of the connector types to detect changes
  const currentHash = JSON.stringify(Object.keys(dynamicConnectorTypes).sort());

  // Skip processing if the connector types haven't changed
  if (lastProcessedConnectorTypesHash === currentHash && dynamicConnectorTypesCache !== null) {
    return;
  }

  // Store the raw dynamic connector types for completion provider access
  dynamicConnectorTypesCache = dynamicConnectorTypes;
  lastProcessedConnectorTypesHash = currentHash;

  // Get base connectors if cache is empty
  if (allConnectorsCache === null) {
    const elasticsearchConnectors = getElasticsearchConnectors();
    const kibanaConnectors = getKibanaConnectors();
    allConnectorsCache = [...staticConnectors, ...elasticsearchConnectors, ...kibanaConnectors];
  }

  // Convert dynamic connectors to ConnectorContract format
  const dynamicConnectors = convertDynamicConnectorsToContracts(dynamicConnectorTypes);

  // Get existing connector types to avoid duplicates
  const existingTypes = new Set(allConnectorsCache.map((c) => c.type));

  // Add only new dynamic connectors
  const newDynamicConnectors = dynamicConnectors.filter((c) => !existingTypes.has(c.type));

  if (newDynamicConnectors.length > 0) {
    allConnectorsCache.push(...newDynamicConnectors);
  }

  setCachedAllConnectorsMap(allConnectorsCache);
}

/**
 * Get cached dynamic connector types (with instances)
 * Used by completion provider to access connector instances
 * TODO: This function is not used anywhere, we should clean it up
 * @deprecated use the store to get dynamic connectors
 */
export function getCachedDynamicConnectorTypes(): Record<string, ConnectorTypeInfo> | null {
  return dynamicConnectorTypesCache;
}

// Combine static connectors with dynamic Elasticsearch and Kibana connectors
export function getAllConnectors(): ConnectorContractUnion[] {
  // Return cached connectors if available
  if (allConnectorsCache !== null) {
    return allConnectorsCache;
  }

  // Initialize cache with static and generated connectors
  const elasticsearchConnectors = getElasticsearchConnectors();
  const kibanaConnectors = getKibanaConnectors();
  allConnectorsCache = [...staticConnectors, ...elasticsearchConnectors, ...kibanaConnectors];
  setCachedAllConnectorsMap(allConnectorsCache);

  return allConnectorsCache;
}

export const getOutputSchemaForStepType = (stepType: string) => {
  const allConnectors = getAllConnectors();
  const connector = allConnectors.find((c) => c.type === stepType);
  if (connector) {
    if (!connector.outputSchema) {
      // throw new Error(`Output schema not found for step type ${stepType}`);
      return z.unknown();
    }
    return connector.outputSchema;
  }

  // Handle internal actions with pattern matching
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors
  if (stepType.startsWith('elasticsearch.')) {
    return z.unknown();
  }

  if (stepType.startsWith('kibana.')) {
    return z.unknown();
  }

  // Fallback to any if not found
  return z.unknown();
};

/**
 * Get all connectors including dynamic ones from actions client
 */
export function getAllConnectorsWithDynamic(
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  const staticAndGeneratedConnectors = getAllConnectors();

  // Graceful fallback if dynamic connectors are not available
  if (!dynamicConnectorTypes || Object.keys(dynamicConnectorTypes).length === 0) {
    // console.debug('Dynamic connectors not available, using static connectors only');
    return staticAndGeneratedConnectors;
  }

  try {
    const dynamicConnectors = convertDynamicConnectorsToContracts(dynamicConnectorTypes);

    // Filter out any duplicates (dynamic connectors override static ones with same type)
    const staticConnectorTypes = new Set(staticAndGeneratedConnectors.map((c) => c.type));
    const uniqueDynamicConnectors = dynamicConnectors.filter(
      (c) => !staticConnectorTypes.has(c.type)
    );

    // Connectors added successfully without logging noise
    return [...staticAndGeneratedConnectors, ...uniqueDynamicConnectors];
  } catch (error) {
    // console.error('Error processing dynamic connectors, falling back to static connectors:', error);
    return staticAndGeneratedConnectors;
  }
}

// Dynamic schemas that include all connectors (static + Elasticsearch + dynamic)
// These use lazy loading to keep large generated files out of the main bundle
export const getWorkflowZodSchema = (dynamicConnectorTypes: Record<string, ConnectorTypeInfo>) => {
  const allConnectors = getAllConnectorsWithDynamic(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors);
};
export type WorkflowZodSchemaType = z.infer<ReturnType<typeof getWorkflowZodSchema>>;

export const getWorkflowZodSchemaLoose = (
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
) => {
  const allConnectors = getAllConnectorsWithDynamic(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors, true);
};
export type WorkflowZodSchemaLooseType = z.infer<ReturnType<typeof getWorkflowZodSchemaLoose>>;

// Legacy exports for backward compatibility - these will be deprecated
// TODO: Remove these once all consumers are updated to use the lazy-loaded versions
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(staticConnectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(staticConnectors, true);

// Partially recreated from x-pack/platform/plugins/shared/alerting/server/connector_adapters/types.ts
// TODO: replace with dynamic schema
