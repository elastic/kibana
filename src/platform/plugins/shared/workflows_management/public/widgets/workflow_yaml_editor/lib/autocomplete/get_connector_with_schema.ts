/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { getCachedAllConnectors } from '../connectors_cache';

/**
 * Get the specific connector's parameter schema for autocomplete
 */
// Cache for connector schemas to avoid repeated processing
const connectorSchemaCache = new Map<string, Record<string, z.ZodType> | null>();

// eslint-disable-next-line complexity
export function getConnectorParamsSchema(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): Record<string, z.ZodType> | null {
  // Check cache first
  if (connectorSchemaCache.has(connectorType)) {
    return connectorSchemaCache.get(connectorType) ?? null;
  }

  try {
    const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);
    const connector = allConnectors.find((c) => c.type === connectorType);

    if (!connector || !connector.paramsSchema) {
      // No paramsSchema found for connector
      connectorSchemaCache.set(connectorType, null);
      return null;
    }

    // Handle function-generated schemas (like the complex union schemas)
    let actualSchema = connector.paramsSchema;
    if (typeof connector.paramsSchema === 'function') {
      try {
        actualSchema = (connector.paramsSchema as Function)();
      } catch (error) {
        // If function execution fails, cache null and return
        connectorSchemaCache.set(connectorType, null);
        return null;
      }
    }

    // Extract the shape from the Zod schema
    if (actualSchema instanceof z.ZodObject) {
      // Found paramsSchema for connector (simple object)
      const result = actualSchema.shape;
      connectorSchemaCache.set(connectorType, result);
      return result;
    }

    // Handle ZodUnion schemas (from our generic intersection fix)
    if (actualSchema instanceof z.ZodUnion) {
      // For union schemas, extract common properties from all options
      const unionOptions = actualSchema._def.options;
      const commonProperties: Record<string, z.ZodType> = {};

      // Helper function to extract properties from any schema type
      const extractPropertiesFromSchema = (schema: z.ZodType): Record<string, z.ZodType> => {
        if (schema instanceof z.ZodObject) {
          return schema.shape;
        } else if (schema instanceof z.ZodIntersection) {
          // For intersections, merge properties from both sides
          const leftProps = extractPropertiesFromSchema(schema._def.left);
          const rightProps = extractPropertiesFromSchema(schema._def.right);
          return { ...leftProps, ...rightProps };
        }
        return {};
      };

      // Get properties that exist in ALL union options
      if (unionOptions.length > 0) {
        const firstOptionProps = extractPropertiesFromSchema(unionOptions[0]);

        // Check each property in the first option
        for (const [key, schema] of Object.entries(firstOptionProps)) {
          // Check if this property exists in ALL other options
          const existsInAll = unionOptions.every((option: z.ZodType) => {
            const optionProps = extractPropertiesFromSchema(option);
            return optionProps[key];
          });

          if (existsInAll) {
            commonProperties[key] = schema;
          }
        }
      }

      if (Object.keys(commonProperties).length > 0) {
        // Found common properties in union schema
        connectorSchemaCache.set(connectorType, commonProperties);
        return commonProperties;
      }
    }

    // Handle ZodIntersection schemas (from complex union handling)
    if (actualSchema instanceof z.ZodIntersection) {
      // Helper function to extract properties from any schema type (reuse from above)
      const extractPropertiesFromSchema = (schema: z.ZodType): Record<string, z.ZodType> => {
        if (schema instanceof z.ZodObject) {
          return schema.shape;
        } else if (schema instanceof z.ZodIntersection) {
          // For intersections, merge properties from both sides
          const leftProps = extractPropertiesFromSchema(schema._def.left);
          const rightProps = extractPropertiesFromSchema(schema._def.right);
          return { ...leftProps, ...rightProps };
        }
        return {};
      };

      // For intersection schemas, extract properties from both sides
      const allProperties = extractPropertiesFromSchema(actualSchema);

      if (Object.keys(allProperties).length > 0) {
        connectorSchemaCache.set(connectorType, allProperties);
        return allProperties;
      }
    }

    // Handle discriminated unions
    if (actualSchema instanceof z.ZodDiscriminatedUnion) {
      // For discriminated unions, extract common properties from all options
      const unionOptions = Array.from(actualSchema._def.options.values());
      const commonProperties: Record<string, z.ZodType> = {};

      // Helper function to extract properties from any schema type (reuse from above)
      const extractPropertiesFromSchema = (schema: z.ZodType): Record<string, z.ZodType> => {
        if (schema instanceof z.ZodObject) {
          return schema.shape;
        } else if (schema instanceof z.ZodIntersection) {
          // For intersections, merge properties from both sides
          const leftProps = extractPropertiesFromSchema(schema._def.left);
          const rightProps = extractPropertiesFromSchema(schema._def.right);
          return { ...leftProps, ...rightProps };
        }
        return {};
      };

      if (unionOptions.length > 0) {
        const firstOptionProps = extractPropertiesFromSchema(unionOptions[0] as z.ZodType);

        // Check each property in the first option
        for (const [key, schema] of Object.entries(firstOptionProps)) {
          // Check if this property exists in ALL other options
          const existsInAll = unionOptions.every((option) => {
            const optionProps = extractPropertiesFromSchema(option as z.ZodType);
            return optionProps[key];
          });

          if (existsInAll) {
            commonProperties[key] = schema;
          }
        }
      }

      if (Object.keys(commonProperties).length > 0) {
        connectorSchemaCache.set(connectorType, commonProperties);
        return commonProperties;
      }
    }

    connectorSchemaCache.set(connectorType, null);
    return null;
  } catch (error) {
    // Error getting connector params schema
    connectorSchemaCache.set(connectorType, null);
    return null;
  }
}
