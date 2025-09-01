/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { InternalConnectorContract } from '@kbn/workflows';

/**
 * Enhanced connector definition that extends auto-generated connectors
 * with better examples, documentation, and user-friendly schemas
 */
export interface EnhancedConnectorDefinition {
  /** The connector type to enhance (must match generated connector) */
  type: string;
  
  /** Enhanced parameter schema with examples and better descriptions */
  enhancedParamsSchema?: z.ZodType;
  
  /** Enhanced description with usage examples */
  enhancedDescription?: string;
  
  /** Example usage snippets for autocomplete */
  examples?: {
    /** Example parameter values for autocomplete */
    params?: Record<string, any>;
    /** Full example workflow step */
    snippet?: string;
  };
  
  /** Override specific parameters with better schemas/examples */
  parameterEnhancements?: Record<string, {
    schema?: z.ZodType;
    example?: any;
    description?: string;
  }>;
}

/**
 * Enhanced Elasticsearch connectors with better examples and documentation
 */
export const ENHANCED_ELASTICSEARCH_CONNECTORS: EnhancedConnectorDefinition[] = [
  {
    type: 'elasticsearch.esql.query',
    enhancedDescription: 'Execute ES|QL queries against Elasticsearch with support for various output formats. Parameters are flattened - no body wrapper needed.',
    examples: {
      params: {
        query: 'FROM my-index | LIMIT 10',
        format: 'json'
      },
      snippet: `- name: run_esql_query
  type: elasticsearch.esql.query
  with:
    format: "json"
    query: "FROM logs-* | WHERE @timestamp > NOW() - 1h | STATS count() BY host.name"`
    },
    parameterEnhancements: {
      query: {
        schema: z.string().min(1).describe('ES|QL query string'),
        example: 'FROM my-index | WHERE status = "active" | LIMIT 100',
        description: 'ES|QL query string. Use the Elasticsearch Query Language to filter, aggregate, and transform data.',
      },
      format: {
        example: 'json',
        description: 'Response format. JSON is recommended for further processing in workflows.',
      },
      columnar: {
        example: false,
        description: 'Return results in columnar format instead of rows.',
      },
    },
  },
  
  {
    type: 'elasticsearch.search',
    enhancedDescription: 'Search documents with query DSL, aggregations, and advanced options. Parameters are flattened - no body wrapper needed.',
    examples: {
      params: {
        index: 'logs-*',
        query: {
          match: {
            message: 'error'
          }
        },
        size: 10
      },
      snippet: `- name: search_logs
  type: elasticsearch.search
  with:
    index: "logs-*"
    query:
      range:
        "@timestamp":
          gte: "now-1h"
    size: 100`
    }
  },

  {
    type: 'elasticsearch.field_caps',
    enhancedDescription: 'Get field capabilities across indices to understand field types and mappings',
    examples: {
      params: {
        index: 'logs-*',
        fields: ['@timestamp', 'message', 'host.name']
      },
      snippet: `- name: get_field_caps
  type: elasticsearch.field_caps
  with:
    index: "logs-*"
    fields:
      - "@timestamp"
      - "message"
      - "host.name"`
    },
    parameterEnhancements: {
      fields: {
        example: ['@timestamp', 'message', 'host.name'],
        description: 'List of field names to get capabilities for'
      }
    }
  }
];

/**
 * Merge enhanced connector definitions with auto-generated connectors
 */
export function mergeEnhancedConnectors(
  generatedConnectors: InternalConnectorContract[],
  enhancedConnectors: EnhancedConnectorDefinition[]
): InternalConnectorContract[] {
  const enhancedMap = new Map(enhancedConnectors.map(e => [e.type, e]));
  
  return generatedConnectors.map(connector => {
    const enhancement = enhancedMap.get(connector.type);
    if (!enhancement) {
      return connector;
    }
    
    console.log(`DEBUG - Enhancing connector: ${connector.type}`);
    console.log('Original paramsSchema keys:', Object.keys((connector.paramsSchema as any)._def?.shape?.() || {}));
    
    // Create enhanced connector
    const enhanced: InternalConnectorContract & { examples?: any } = {
      ...connector,
      description: enhancement.enhancedDescription || connector.description,
      ...(enhancement.examples && { examples: enhancement.examples }),
    };
    
    // Override parameter schema if provided
    if (enhancement.enhancedParamsSchema) {
      console.log('Using enhancedParamsSchema');
      enhanced.paramsSchema = enhancement.enhancedParamsSchema;
    } else if (enhancement.parameterEnhancements) {
      console.log('Using parameterEnhancements');
      // Enhance individual parameters
      enhanced.paramsSchema = enhanceParameterSchema(
        connector.paramsSchema,
        enhancement.parameterEnhancements
      );
    }
    
    console.log('Enhanced paramsSchema:', enhanced.paramsSchema);
    return enhanced;
  });
}

/**
 * Enhance individual parameters in a schema
 */
function enhanceParameterSchema(
  originalSchema: z.ZodType,
  enhancements: Record<string, { schema?: z.ZodType; example?: any; description?: string }>
): z.ZodType {
  console.log('DEBUG - enhanceParameterSchema called');
  console.log('Original schema:', originalSchema);
  console.log('Enhancements:', enhancements);
  
  if (!(originalSchema instanceof z.ZodObject)) {
    console.log('Not a ZodObject, returning original');
    return originalSchema;
  }
  
  const shape = originalSchema.shape;
  const enhancedShape: Record<string, z.ZodType> = {};
  
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const enhancement = enhancements[key];
    if (enhancement?.schema) {
      console.log(`Enhancing field: ${key}`);
      enhancedShape[key] = enhancement.schema;
    } else {
      enhancedShape[key] = fieldSchema as z.ZodType;
    }
  }
  
  const result = z.object(enhancedShape);
  console.log('Enhanced schema result:', result);
  return result;
}
