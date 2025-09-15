/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContract } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { z } from '@kbn/zod';

// Static connectors used for schema generation
const staticConnectors: ConnectorContract[] = [
  {
    type: 'console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
  },
  {
    type: 'slack',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.object({
      message: z.string(),
    }),
  },
  {
    type: 'inference.unified_completion',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        body: z.object({
          messages: z.array(
            z.object({
              role: z.string(),
              content: z.string(),
            })
          ),
        }),
      })
      .required(),
    // TODO: use UnifiedChatCompleteResponseSchema from stack_connectors/common/inference/schema.ts
    outputSchema: z.object({
      id: z.string(),
      choices: z.array(
        z.object({
          message: z.object({
            content: z.string(),
            role: z.string(),
          }),
        })
      ),
    }),
  },
  {
    type: 'inference.completion',
    connectorIdRequired: true,
    paramsSchema: z.object({
      input: z.string(),
    }),
    outputSchema: z.array(
      z.object({
        result: z.string(),
      })
    ),
  },
  // Generic request types for raw API calls
  {
    type: 'elasticsearch.request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      params: z.any().optional(),
    }),
    outputSchema: z.any(),
  },
  {
    type: 'kibana.request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      headers: z.any().optional(),
    }),
    outputSchema: z.any(),
  },
];

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
function generateElasticsearchConnectors(): ConnectorContract[] {
  // Lazy load the large generated files to keep them out of the main bundle
  const {
    GENERATED_ELASTICSEARCH_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/workflows/common/generated_es_connectors');

  const {
    ENHANCED_ELASTICSEARCH_CONNECTORS,
    mergeEnhancedConnectors,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./enhanced_es_connectors');

  // Return enhanced connectors (merge generated with enhanced definitions)
  return mergeEnhancedConnectors(
    GENERATED_ELASTICSEARCH_CONNECTORS,
    ENHANCED_ELASTICSEARCH_CONNECTORS
  );
}

function generateKibanaConnectors(): ConnectorContract[] {
  // Lazy load the generated Kibana connectors

  const {
    GENERATED_KIBANA_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/workflows/common/generated_kibana_connectors');

  // Return the pre-generated Kibana connectors (build-time generated, browser-safe)
  return GENERATED_KIBANA_CONNECTORS;
}

/**
 * Convert dynamic connector data from actions client to ConnectorContract format
 */
export function convertDynamicConnectorsToContracts(
  connectorTypes: Record<string, {
    actionTypeId: string;
    displayName: string;
    instances: Array<{ id: string; name: string; isPreconfigured: boolean; isDeprecated: boolean }>;
    enabled?: boolean;
    enabledInConfig?: boolean;
    enabledInLicense?: boolean;
    minimumLicenseRequired?: string;
  }>
): ConnectorContract[] {
  return Object.values(connectorTypes).map((connectorType) => {
    try {
      // Create connector ID schema with available instances
      // If no instances exist, use a generic string schema
      const connectorIdSchema = connectorType.instances.length > 0 
        ? z.enum([connectorType.instances[0].id, ...connectorType.instances.slice(1).map(i => i.id)] as [string, ...string[]])
        : z.string();

      return {
        type: connectorType.actionTypeId,
        paramsSchema: z.any(), // Generic schema for now - can be enhanced later
        connectorIdRequired: true, // Most dynamic connectors require an ID
        connectorId: connectorIdSchema,
        outputSchema: z.any(), // Generic output schema for now
        description: `${connectorType.displayName} connector${connectorType.instances.length === 0 ? ' (no instances configured)' : ''}`,
      };
    } catch (error) {
      console.warn(`Error processing connector type ${connectorType.actionTypeId}:`, error);
      // Return a basic connector contract as fallback
      return {
        type: connectorType.actionTypeId,
        paramsSchema: z.any(),
        connectorIdRequired: true,
        connectorId: z.string(),
        outputSchema: z.any(),
        description: `${connectorType.displayName || connectorType.actionTypeId} connector`,
      };
    }
  });
}

// Global cache for all connectors (static + generated + dynamic)
let allConnectorsCache: ConnectorContract[] | null = null;

/**
 * Add dynamic connectors to the global cache
 * Call this when dynamic connector data is fetched from the API
 */
export function addDynamicConnectorsToCache(
  dynamicConnectorTypes: Record<string, {
    actionTypeId: string;
    displayName: string;
    instances: Array<{ id: string; name: string; isPreconfigured: boolean; isDeprecated: boolean }>;
    enabled?: boolean;
    enabledInConfig?: boolean;
    enabledInLicense?: boolean;
    minimumLicenseRequired?: string;
  }>
) {
  // Get base connectors if cache is empty
  if (allConnectorsCache === null) {
    const elasticsearchConnectors = generateElasticsearchConnectors();
    const kibanaConnectors = generateKibanaConnectors();
    allConnectorsCache = [...staticConnectors, ...elasticsearchConnectors, ...kibanaConnectors];
  }
  
  // Convert dynamic connectors to ConnectorContract format
  const dynamicConnectors = convertDynamicConnectorsToContracts(dynamicConnectorTypes);
  
  // Get existing connector types to avoid duplicates
  const existingTypes = new Set(allConnectorsCache.map(c => c.type));
  
  // Add only new dynamic connectors
  const newDynamicConnectors = dynamicConnectors.filter(c => !existingTypes.has(c.type));
  
  if (newDynamicConnectors.length > 0) {
    allConnectorsCache.push(...newDynamicConnectors);
    console.debug(`Added ${newDynamicConnectors.length} new dynamic connectors to cache`);
  }
}

// Combine static connectors with dynamic Elasticsearch and Kibana connectors
export function getAllConnectors(): ConnectorContract[] {
  // Return cached connectors if available
  if (allConnectorsCache !== null) {
    return allConnectorsCache;
  }
  
  // Initialize cache with static and generated connectors
  const elasticsearchConnectors = generateElasticsearchConnectors();
  const kibanaConnectors = generateKibanaConnectors();
  allConnectorsCache = [...staticConnectors, ...elasticsearchConnectors, ...kibanaConnectors];
  
  return allConnectorsCache;
}

export const getOutputSchemaForStepType = (stepType: string) => {
  const allConnectors = getAllConnectors();
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

/**
 * Get all connectors including dynamic ones from actions client
 */
export function getAllConnectorsWithDynamic(
  dynamicConnectorTypes?: Record<string, {
    actionTypeId: string;
    displayName: string;
    instances: Array<{ id: string; name: string; isPreconfigured: boolean; isDeprecated: boolean }>;
    enabled?: boolean;
    enabledInConfig?: boolean;
    enabledInLicense?: boolean;
    minimumLicenseRequired?: string;
  }>
): ConnectorContract[] {
  const staticAndGeneratedConnectors = getAllConnectors();
  
  // Graceful fallback if dynamic connectors are not available
  if (!dynamicConnectorTypes || Object.keys(dynamicConnectorTypes).length === 0) {
    console.debug('Dynamic connectors not available, using static connectors only');
    return staticAndGeneratedConnectors;
  }
  
  try {
    const dynamicConnectors = convertDynamicConnectorsToContracts(dynamicConnectorTypes);
    
    // Filter out any duplicates (dynamic connectors override static ones with same type)
    const staticConnectorTypes = new Set(staticAndGeneratedConnectors.map(c => c.type));
    const uniqueDynamicConnectors = dynamicConnectors.filter(c => !staticConnectorTypes.has(c.type));
    
    console.debug(`Added ${uniqueDynamicConnectors.length} dynamic connectors to schema`);
    return [...staticAndGeneratedConnectors, ...uniqueDynamicConnectors];
  } catch (error) {
    console.error('Error processing dynamic connectors, falling back to static connectors:', error);
    return staticAndGeneratedConnectors;
  }
}

// Dynamic schemas that include all connectors (static + Elasticsearch + dynamic)
// These use lazy loading to keep large generated files out of the main bundle
export const getWorkflowZodSchema = (dynamicConnectorTypes?: Record<string, any>) => {
  const allConnectors = getAllConnectorsWithDynamic(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors);
};

export const getWorkflowZodSchemaLoose = (dynamicConnectorTypes?: Record<string, any>) => {
  const allConnectors = getAllConnectorsWithDynamic(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors, true);
};

// Legacy exports for backward compatibility - these will be deprecated
// TODO: Remove these once all consumers are updated to use the lazy-loaded versions
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(staticConnectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(staticConnectors, true);

// Partially recreated from x-pack/platform/plugins/shared/alerting/server/connector_adapters/types.ts
// TODO: replace with dynamic schema

// TODO: import AlertSchema from from '@kbn/alerts-as-data-utils' once it exported, now only type is exported
const AlertSchema = z.object({
  _id: z.string(),
  _index: z.string(),
  kibana: z.object({
    alert: z.any(),
  }),
  '@timestamp': z.string(),
});

const SummarizedAlertsChunkSchema = z.object({
  count: z.number(),
  data: z.array(z.union([AlertSchema, z.any()])),
});

const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  consumer: z.string(),
  producer: z.string(),
  ruleTypeId: z.string(),
});

export const EventSchema = z.object({
  alerts: z.object({
    new: SummarizedAlertsChunkSchema,
    ongoing: SummarizedAlertsChunkSchema,
    recovered: SummarizedAlertsChunkSchema,
    all: SummarizedAlertsChunkSchema,
  }),
  rule: RuleSchema,
  spaceId: z.string(),
  params: z.any(),
});
