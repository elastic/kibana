/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConnectorContractUnion,
  ConnectorTypeInfo,
  EnhancedInternalConnectorContract,
  InternalConnectorContract,
} from '@kbn/workflows';
import {
  enhanceKibanaConnectorsWithFetcher,
  generateYamlSchemaFromConnectors,
} from '@kbn/workflows';
import { z } from '@kbn/zod';

// Import connector schemas from the organized structure
import {
  ConnectorActionInputSchemas,
  ConnectorActionOutputSchemas,
  ConnectorInputSchemas,
  ConnectorOutputSchemas,
  ConnectorSpecsInputSchemas,
  staticConnectors,
} from './connector_action_schema';
import { mergeEnhancedConnectors } from './enhanced_es_connectors';
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
 * Elasticsearch Connector Generation
 *
 * This system provides ConnectorContract[] for all Elasticsearch APIs
 * by using pre-generated definitions from Console's API specifications.
 *
 * Benefits:
 * 1. **Schema Validation**: Zod schemas for all ES API parameters
 * 2. **Autocomplete**: Monaco YAML editor gets full autocomplete via JSON Schema
 * 3. **Comprehensive Coverage**: 568 Elasticsearch APIs supported
 * 4. **Browser Compatible**: No file system access required
 * 5. **Lazy Loading**: Large generated files are only loaded when needed, reducing main bundle size
 *
 * The generated connectors include:
 * - All Console API definitions converted to Zod schemas
 * - Path parameters extracted from patterns (e.g., {index}, {id})
 * - URL parameters with proper types (flags, enums, strings, numbers)
 * - Proper ConnectorContract format for workflow execution
 *
 * To regenerate: run `npm run generate:es-connectors` from @kbn/workflows package
 */
function generateElasticsearchConnectors(): EnhancedInternalConnectorContract[] {
  // Lazy load the large generated files to keep them out of the main bundle
  const {
    GENERATED_ELASTICSEARCH_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/workflows/common/generated/elasticsearch_connectors');

  const {
    ENHANCED_ELASTICSEARCH_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./enhanced_es_connectors');

  // Return enhanced connectors (merge generated with enhanced definitions)
  return mergeEnhancedConnectors(
    GENERATED_ELASTICSEARCH_CONNECTORS,
    ENHANCED_ELASTICSEARCH_CONNECTORS
  );
}

function generateKibanaConnectors(): InternalConnectorContract[] {
  // Lazy load the generated Kibana connectors
  const {
    GENERATED_KIBANA_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/workflows/common/generated/kibana_connectors');

  // Enhance connectors with fetcher parameter support
  return enhanceKibanaConnectorsWithFetcher(GENERATED_KIBANA_CONNECTORS);
}

/**
 * Get registered step definitions from workflowExtensions
 */
function getRegisteredStepDefinitions(): EnhancedInternalConnectorContract[] {
  return stepSchemas.getAllRegisteredStepDefinitions().map((stepDefinition) => {
    const extra: Partial<EnhancedInternalConnectorContract> = {};
    if (stepSchemas.isPublicStepDefinition(stepDefinition)) {
      extra.summary = stepDefinition.description;
      extra.description = stepDefinition.label;
      extra.documentation = stepDefinition.documentation?.url;
      if (stepDefinition.documentation?.examples) {
        extra.examples = { snippet: stepDefinition.documentation?.examples.join('\n') };
      }
    }
    return {
      type: stepDefinition.id,
      paramsSchema: stepDefinition.inputSchema,
      outputSchema: stepDefinition.outputSchema,
      ...extra,
    };
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

          connectorContracts.push({
            type: subActionType,
            summary: subAction.displayName,
            paramsSchema: getSubActionParamsSchema(connectorType.actionTypeId, subAction.name),
            connectorIdRequired: true,
            connectorId: connectorIdSchema,
            outputSchema: getSubActionOutputSchema(connectorType.actionTypeId, subAction.name),
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
        type: connectorType.actionTypeId,
        summary: connectorType.displayName,
        paramsSchema: z.any(),
        connectorIdRequired: true,
        connectorId: z.string(),
        outputSchema: z.any(),
        description: `${connectorType.displayName || connectorType.actionTypeId} connector`,
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
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(staticConnectors, true);

/**
 * Combine static connectors with dynamic Elasticsearch and Kibana connectors
 * Internal implementation - use exported getAllConnectors() instead
 */
function getAllConnectorsInternal(): ConnectorContractUnion[] {
  // Return cached connectors if available
  const cached = stepSchemas.getAllConnectorsCache();
  if (cached !== null) {
    return cached;
  }

  // Get registered step definitions if workflowExtensions is initialized
  const registeredStepDefinitions = getRegisteredStepDefinitions();

  // Initialize cache with static and generated connectors
  const elasticsearchConnectors = generateElasticsearchConnectors();
  const kibanaConnectors = generateKibanaConnectors();
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
    const elasticsearchConnectors = generateElasticsearchConnectors();
    const kibanaConnectors = generateKibanaConnectors();
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

export const getOutputSchemaForStepType = (stepType: string): z.ZodSchema => {
  const allConnectors = getAllConnectorsInternal();
  const connector = allConnectors.find((c) => c.type === stepType);
  if (connector) {
    return connector.outputSchema;
  }

  // Handle internal actions with pattern matching
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors
  if (stepType.startsWith('elasticsearch.')) {
    return z.any();
  }

  if (stepType.startsWith('kibana.')) {
    return z.any();
  }

  // Fallback to any if not found
  return z.any();
};

export function getAllConnectorsWithDynamic(
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  return getAllConnectorsWithDynamicInternal(dynamicConnectorTypes);
}

export const getWorkflowZodSchema = (
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
): z.ZodTypeAny => {
  const allConnectors = getAllConnectorsWithDynamicInternal(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors);
};

export const getWorkflowZodSchemaLoose = (
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
): z.ZodTypeAny => {
  const allConnectors = getAllConnectorsWithDynamicInternal(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors, true);
};
