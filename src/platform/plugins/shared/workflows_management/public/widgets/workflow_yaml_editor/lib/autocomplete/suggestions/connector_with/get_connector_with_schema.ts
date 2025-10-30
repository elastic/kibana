/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion, ConnectorTypeInfo } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { getCachedAllConnectors } from '../../../connectors_cache';

/**
 * Get the specific connector's parameter schema for autocomplete
 */
// Cache for connector schemas to avoid repeated processing
const connectorSchemaCache = new Map<string, Record<string, z.ZodType> | null>();

function getCachedSchema(connectorType: string): Record<string, z.ZodType> | null | undefined {
  return connectorSchemaCache.get(connectorType);
}

function setCachedSchema(connectorType: string, schema: Record<string, z.ZodType> | null): void {
  connectorSchemaCache.set(connectorType, schema);
}

function findConnector(
  connectorType: string,
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion | undefined {
  const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);
  return allConnectors.find((c) => c.type === connectorType);
}

function extractActualSchema(paramsSchema: unknown): z.ZodType | null {
  let actualSchema = paramsSchema;
  if (typeof paramsSchema === 'function') {
    try {
      actualSchema = (paramsSchema as Function)();
    } catch {
      return null;
    }
  }
  return actualSchema as z.ZodType;
}

/**
 * Extract properties from any schema type recursively
 */
function extractPropertiesFromSchema(schema: z.ZodType): Record<string, z.ZodType> {
  if (schema instanceof z.ZodObject) {
    return schema.shape;
  } else if (schema instanceof z.ZodIntersection) {
    // For intersections, merge properties from both sides
    const leftProps = extractPropertiesFromSchema(schema._def.left);
    const rightProps = extractPropertiesFromSchema(schema._def.right);
    return { ...leftProps, ...rightProps };
  }
  return {};
}

/**
 * Find common properties across all union options
 */
function getCommonUnionProperties(options: z.ZodType[]): Record<string, z.ZodType> {
  if (options.length === 0) {
    return {};
  }

  const commonProperties: Record<string, z.ZodType> = {};
  const firstOptionProps = extractPropertiesFromSchema(options[0]);

  // Check each property in the first option
  for (const [key, schema] of Object.entries(firstOptionProps)) {
    // Check if this property exists in ALL other options
    const existsInAll = options.every((option) => {
      const optionProps = extractPropertiesFromSchema(option);
      return optionProps[key];
    });

    if (existsInAll) {
      commonProperties[key] = schema;
    }
  }

  return commonProperties;
}

/**
 * Process simple ZodObject schema
 */
function processObjectSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, z.ZodType> {
  return schema.shape;
}

/**
 * Process ZodUnion schema
 */
function processUnionSchema(
  schema: z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>
): Record<string, z.ZodType> | null {
  const unionOptions = schema._def.options;
  const commonProperties = getCommonUnionProperties(unionOptions);
  return Object.keys(commonProperties).length > 0 ? commonProperties : null;
}

/**
 * Process ZodIntersection schema
 */
function processIntersectionSchema(
  schema: z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>
): Record<string, z.ZodType> | null {
  const allProperties = extractPropertiesFromSchema(schema);
  return Object.keys(allProperties).length > 0 ? allProperties : null;
}

/**
 * Process ZodDiscriminatedUnion schema
 */
function processDiscriminatedUnionSchema(
  schema: z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>
): Record<string, z.ZodType> | null {
  const unionOptions = Array.from(schema._def.options.values()) as z.ZodType[];
  const commonProperties = getCommonUnionProperties(unionOptions);
  return Object.keys(commonProperties).length > 0 ? commonProperties : null;
}

/**
 * Extract schema properties based on schema type
 */
function extractSchemaProperties(schema: z.ZodType): Record<string, z.ZodType> | null {
  if (schema instanceof z.ZodObject) {
    return processObjectSchema(schema);
  }

  if (schema instanceof z.ZodUnion) {
    return processUnionSchema(schema);
  }

  if (schema instanceof z.ZodIntersection) {
    return processIntersectionSchema(schema);
  }

  if (schema instanceof z.ZodDiscriminatedUnion) {
    return processDiscriminatedUnionSchema(schema);
  }

  return null;
}

export function _getConnectorParamsSchema(
  connectorType: string,
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
): Record<string, z.ZodType> | null {
  try {
    const connector = findConnector(connectorType, dynamicConnectorTypes);
    if (!connector || !connector.paramsSchema) {
      return null;
    }

    const actualSchema = extractActualSchema(connector.paramsSchema);
    if (!actualSchema) {
      return null;
    }

    return extractSchemaProperties(actualSchema);
  } catch (error) {
    return null;
  }
}

export function getConnectorParamsSchema(
  connectorType: string,
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
): Record<string, z.ZodType> | null {
  const cached = getCachedSchema(connectorType);
  if (cached !== undefined) {
    return cached;
  }

  const result = _getConnectorParamsSchema(connectorType, dynamicConnectorTypes);
  if (result !== null) {
    setCachedSchema(connectorType, result);
  }

  return result;
}

// Export for testing
export {
  getCachedSchema,
  setCachedSchema,
  findConnector,
  extractActualSchema,
  extractPropertiesFromSchema,
  getCommonUnionProperties,
  processObjectSchema,
  processUnionSchema,
  processIntersectionSchema,
  processDiscriminatedUnionSchema,
  extractSchemaProperties,
};
