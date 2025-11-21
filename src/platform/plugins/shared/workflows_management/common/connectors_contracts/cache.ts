/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  ConnectorContractUnion,
  ConnectorTypeInfo,
  EnhancedInternalConnectorContract,
  InternalConnectorContract,
} from '@kbn/workflows';
import { enhanceKibanaConnectorsWithFetcher } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { convertDynamicConnectorsToContracts } from './convert_dynamic_conectors_to_contracts';
import { mergeEnhancedConnectors } from './enhanced_es_connectors';
import { getConnectorsCacheFromList } from './utils';

// THIS FILE SHOULD BE THE ONLY ENTRY POINT FOR CONNECTORS CACHING AND RETRIEVAL
// static + generated is around 1070 connectors, so we don't want to re-compute it every time

// Static connectors used for schema generation
export const StaticConnectors: ConnectorContractUnion[] = [
  {
    type: 'console',
    summary: 'Console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
    description: i18n.translate('workflows.connectors.console.description', {
      defaultMessage: 'Log a message to the workflow logs',
    }),
  },
  // Note: inference sub-actions are now generated dynamically
  // Generic request types for raw API calls
  {
    type: 'elasticsearch.request',
    summary: 'Elasticsearch Request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      params: z.any().optional(),
      headers: z.any().optional(),
    }),
    outputSchema: z.any(),
    description: i18n.translate('workflows.connectors.elasticsearch.request.description', {
      defaultMessage: 'Make a generic request to an Elasticsearch API',
    }),
  },
  {
    type: 'kibana.request',
    summary: 'Kibana Request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      headers: z.any().optional(),
    }),
    outputSchema: z.any(),
    description: i18n.translate('workflows.connectors.kibana.request.description', {
      defaultMessage: 'Make a generic request to a Kibana API',
    }),
  },
];

interface ConnectorsCache {
  list: ConnectorContractUnion[];
  map: Map<string, ConnectorContractUnion>;
  types: Set<string>;
}

// Global cache for all connectors (static + generated + dynamic)
let allConnectorsCache: ConnectorsCache | null = null;

// helper caches for static and generated connectors
let staticAndGeneratedConnectorsCache: ConnectorsCache | null = null;

// Global cache for dynamic connector types (with instances)
let dynamicConnectorTypesCache: Record<string, ConnectorTypeInfo> | null = null;

// Track the last processed connector types to avoid unnecessary re-processing
let lastProcessedConnectorTypesHash: string | null = null;

export function getConnectorsCache(): ConnectorsCache {
  if (allConnectorsCache !== null) {
    return allConnectorsCache;
  }
  const newConnectors = getConnectorsCacheFromList([
    ...StaticConnectors,
    ...getElasticsearchConnectors(),
    ...getKibanaConnectors(),
  ]);
  allConnectorsCache = newConnectors;
  return newConnectors;
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

  allConnectorsCache = getAllConnectorsForDynamicTypes(dynamicConnectorTypes);
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
export function getStaticAndGeneratedConnectorsCached(): ConnectorsCache {
  // Return cached connectors if available
  if (staticAndGeneratedConnectorsCache !== null) {
    return staticAndGeneratedConnectorsCache;
  }
  const newConnectors = getConnectorsCacheFromList([
    ...StaticConnectors,
    ...getElasticsearchConnectors(),
    ...getKibanaConnectors(),
  ]);
  staticAndGeneratedConnectorsCache = newConnectors;
  return newConnectors;
}

/**
 * Get all connectors including dynamic ones from actions client
 */
export function getAllConnectorsForDynamicTypes(
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorsCache {
  const staticAndGeneratedConnectors = getStaticAndGeneratedConnectorsCached();

  // Graceful fallback if dynamic connectors are not available
  if (Object.keys(dynamicConnectorTypes).length === 0) {
    // console.debug('Dynamic connectors not available, using static connectors only');
    return staticAndGeneratedConnectors;
  }

  const dynamicConnectors = convertDynamicConnectorsToContracts(dynamicConnectorTypes);

  // Filter out any duplicates (dynamic connectors override static ones with same type)
  const staticConnectorTypes = staticAndGeneratedConnectors.types;
  const uniqueDynamicConnectors = dynamicConnectors.filter(
    (c) => !staticConnectorTypes.has(c.type)
  );

  return getConnectorsCacheFromList([
    ...staticAndGeneratedConnectors.list,
    ...uniqueDynamicConnectors,
  ]);
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
function getElasticsearchConnectors(): EnhancedInternalConnectorContract[] {
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

function getKibanaConnectors(): InternalConnectorContract[] {
  // Lazy load the generated Kibana connectors
  const {
    GENERATED_KIBANA_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/workflows/common/generated/kibana_connectors');

  // Enhance connectors with fetcher parameter support
  return enhanceKibanaConnectorsWithFetcher(GENERATED_KIBANA_CONNECTORS);
}
