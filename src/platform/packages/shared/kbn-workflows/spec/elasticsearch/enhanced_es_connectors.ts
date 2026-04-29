/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../..';

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
    params?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    /** Full example workflow step */
    snippet?: string;
  };

  /** Override specific parameters with better schemas/examples */
  parameterEnhancements?: Record<
    string,
    { schema?: z.ZodType; example?: unknown; description?: string }
  >;
}

/**
 * Enhanced Elasticsearch connectors with better examples and documentation
 */
export const ENHANCED_ELASTICSEARCH_CONNECTORS: EnhancedConnectorDefinition[] = [
  {
    type: 'elasticsearch.esql.query',
    enhancedDescription:
      'Execute ES|QL queries against Elasticsearch with support for various output formats. Parameters are flattened - no body wrapper needed.',
    examples: {
      params: {
        query: 'FROM my-index | LIMIT 10',
        format: 'json',
      },
      snippet: `- name: run_esql_query
  type: elasticsearch.esql.query
  with:
    format: "json"
    query: "FROM logs-* | WHERE @timestamp > NOW() - 1h | STATS count() BY host.name"`,
    },
    parameterEnhancements: {
      query: {
        schema: z.string().min(1).describe('ES|QL query string'),
        example: 'FROM my-index | WHERE status = "active" | LIMIT 100',
        description:
          'ES|QL query string. Use the Elasticsearch Query Language to filter, aggregate, and transform data.',
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
    enhancedDescription:
      'Search documents with query DSL, aggregations, and advanced options. Parameters are flattened - no body wrapper needed.',
    examples: {
      params: {
        index: 'logs-*',
        query: {
          match: {
            message: 'error',
          },
        },
        size: 10,
      },
      snippet: `- name: search_logs
  type: elasticsearch.search
  with:
    index: "logs-*"
    query:
      range:
        "@timestamp":
          gte: "now-1h"
    size: 100`,
    },
  },

  {
    type: 'elasticsearch.field_caps',
    enhancedDescription:
      'Get field capabilities across indices to understand field types and mappings',
    examples: {
      params: {
        index: 'logs-*',
        fields: ['@timestamp', 'message', 'host.name'],
      },
      snippet: `- name: get_field_caps
  type: elasticsearch.field_caps
  with:
    index: "logs-*"
    fields:
      - "@timestamp"
      - "message"
      - "host.name"`,
    },
    parameterEnhancements: {
      fields: {
        example: ['@timestamp', 'message', 'host.name'],
        description: 'List of field names to get capabilities for',
      },
    },
  },
];

/**
 * Merge enhanced connector definitions with auto-generated connectors
 */
export function mergeEnhancedConnectors(
  generatedConnectors: InternalConnectorContract[],
  enhancedConnectors: EnhancedConnectorDefinition[]
): InternalConnectorContract[] {
  const enhancedMap = new Map(enhancedConnectors.map((e) => [e.type, e]));

  return generatedConnectors.map((connector) => {
    const enhancement = enhancedMap.get(connector.type);
    if (!enhancement) {
      return connector;
    }

    // Debug logging removed for performance

    // Create enhanced connector
    const enhanced: InternalConnectorContract = {
      ...connector,
      description: enhancement.enhancedDescription || connector.description,
      ...(enhancement.examples && { examples: enhancement.examples }),
    };

    // Override parameter schema if provided
    if (enhancement.enhancedParamsSchema) {
      // Using enhancedParamsSchema
      enhanced.paramsSchema = enhancement.enhancedParamsSchema;
    } else if (enhancement.parameterEnhancements) {
      // Using parameterEnhancements
      // Enhance individual parameters
      enhanced.paramsSchema = enhanceParameterSchema(
        connector.paramsSchema,
        enhancement.parameterEnhancements
      );
    }

    // Enhanced paramsSchema applied
    return enhanced;
  });
}

/**
 * Enhance individual parameters in a schema
 */
function enhanceParameterSchema(
  originalSchema: z.ZodType,
  enhancements: Record<string, { schema?: z.ZodType; example?: unknown; description?: string }>
): z.ZodType {
  // Enhanced parameter schema processing

  if (!(originalSchema instanceof z.ZodObject)) {
    // Not a ZodObject, returning original
    return originalSchema;
  }

  const shape = originalSchema.shape;
  const enhancedShape: Record<string, z.ZodType> = {};

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const enhancement = enhancements[key];
    if (enhancement?.schema) {
      // Enhancing field
      enhancedShape[key] = enhancement.schema;
    } else {
      enhancedShape[key] = fieldSchema as z.ZodType;
    }
  }

  const result = z.object(enhancedShape);
  // Enhanced schema result created
  return result;
}
