/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Document } from 'yaml';
import YAML from 'yaml';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod';
import { z } from '@kbn/zod/v4';
import { getDetailedTypeDescription } from './zod_type_description';
import { getAllConnectors } from '../../schema';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorContext {
  schema?: z.ZodType;
  yamlDocument?: Document;
}

export interface EnrichmentResult {
  message: string;
  enriched: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache
// ═══════════════════════════════════════════════════════════════════════════

const enrichmentCache = new Map<string, string | null>();

export function clearEnrichmentCache(): void {
  enrichmentCache.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
// Main API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Core function to enrich an error message with schema-aware hints.
 * Used by both formatZodError (for Zod errors) and formatMonacoYamlMarker (for Monaco).
 */
export function enrichErrorMessage(
  path: PropertyKey[],
  originalMessage: string,
  errorCode: string,
  context: ErrorContext
): EnrichmentResult {
  const { schema, yamlDocument } = context;
  // TODO: remove the field name, it's in the path, and could be nested; also default fieldback doesn't make sense
  const fieldName = path.length > 0 ? String(path[path.length - 1]) : 'field';

  // Try schema-aware enrichment first (requires schema)
  if (schema && path.length > 0) {
    const schemaEnriched = trySchemaAwareEnrichment(path, fieldName, errorCode, context);
    if (schemaEnriched) {
      return { message: schemaEnriched, enriched: true };
    }
  }

  // Try code-specific enrichment (works without schema)
  const codeEnriched = tryCodeSpecificEnrichment(path, fieldName, errorCode, originalMessage);
  if (codeEnriched) {
    return { message: codeEnriched, enriched: true };
  }

  // Fallback: original message with path
  const fallbackMessage =
    path.length > 0 ? `${originalMessage} at ${path.join('.')}` : originalMessage;
  return { message: fallbackMessage, enriched: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// Schema-Aware Enrichment
// ═══════════════════════════════════════════════════════════════════════════

function trySchemaAwareEnrichment(
  path: PropertyKey[],
  fieldName: string,
  errorCode: string,
  context: ErrorContext
): string | null {
  const { schema, yamlDocument } = context;

  // Get step type for cache key (handles nested steps)
  const stepType = getStepTypeAtPath(path, yamlDocument);
  const cacheKey = `${path.join('.')}-${fieldName}-${stepType ?? 'unknown'}`;

  if (enrichmentCache.has(cacheKey)) {
    return enrichmentCache.get(cacheKey) ?? null;
  }

  let result: string | null = null;

  // Try connector params schema enrichment (unified handling for all types)
  result = tryConnectorSchemaEnrichment(path, fieldName, yamlDocument);

  // Fallback: try full workflow schema path
  if (!result && schema) {
    result = tryWorkflowSchemaEnrichment(path, fieldName, schema);
  }

  enrichmentCache.set(cacheKey, result);
  return result;
}

/**
 * Tries to enrich using connector params schema.
 * Handles all schema types: objects, unions, arrays, primitives, etc.
 */
function tryConnectorSchemaEnrichment(
  path: PropertyKey[],
  fieldName: string,
  yamlDocument?: Document
): string | null {
  // Find the step info from the path
  const stepInfo = findStepInfoFromPath(path, yamlDocument);
  if (!stepInfo) return null;

  const { stepType, pathWithinWith } = stepInfo;

  // Get the connector params schema
  const paramsSchema = getConnectorParamsSchema(stepType);
  if (!paramsSchema) return null;

  // Get the field schema at the path within 'with'
  const fieldSchema =
    pathWithinWith.length === 0
      ? paramsSchema
      : getSchemaAtPath(paramsSchema, pathWithinWith.join('.'))?.schema;

  if (!fieldSchema) return null;

  return generateSchemaErrorMessage(fieldName, fieldSchema);
}

/**
 * Fallback: tries to enrich using the full workflow schema path.
 * Only used when connector schema lookup fails.
 */
function tryWorkflowSchemaEnrichment(
  path: PropertyKey[],
  fieldName: string,
  schema: z.ZodType
): string | null {
  const pathString = path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
    .join('.')
    .replace(/\.\[/g, '[');

  const schemaAtPath = getSchemaAtPath(schema, pathString);
  if (!schemaAtPath?.schema) return null;

  return generateSchemaErrorMessage(fieldName, schemaAtPath.schema);
}

// ═══════════════════════════════════════════════════════════════════════════
// Code-Specific Enrichment (no schema required)
// ═══════════════════════════════════════════════════════════════════════════

function tryCodeSpecificEnrichment(
  path: PropertyKey[],
  fieldName: string,
  errorCode: string,
  originalMessage: string
): string | null {
  // Handle trigger union errors
  if (errorCode === 'invalid_union' && path.includes('triggers')) {
    return 'Invalid trigger type. Available: manual, alert, scheduled';
  }

  // Handle connector type union errors
  if (errorCode === 'invalid_union' && path.includes('type')) {
    return 'Invalid connector type. Use Ctrl+Space to see available options.';
  }

  // Handle literal type errors for connector types
  if (errorCode === 'invalid_literal' && path.includes('type')) {
    const receivedMatch = originalMessage.match(/received[:\s]+"?([^"]+)"?/i);
    const receivedValue = receivedMatch?.[1] || '';

    if (receivedValue.startsWith?.('elasticsearch.')) {
      return `Unknown Elasticsearch API: "${receivedValue}". Use autocomplete to see valid elasticsearch.* APIs.`;
    }
    if (receivedValue.startsWith?.('kibana.')) {
      return `Unknown Kibana API: "${receivedValue}". Use autocomplete to see valid kibana.* APIs.`;
    }
    return `Unknown connector type: "${receivedValue}". Available: elasticsearch.*, kibana.*, slack, http, console, wait, inference.*`;
  }

  // Handle missing triggers
  if (errorCode === 'invalid_type' && path.length === 1 && path[0] === 'triggers') {
    return 'No triggers found. Add at least one trigger.';
  }

  // Handle missing steps
  if (errorCode === 'invalid_type' && path.length === 1 && path[0] === 'steps') {
    return 'No steps found. Add at least one step.';
  }

  // Generic fallback for union errors with a field name
  if (errorCode === 'invalid_union' && path.length > 0) {
    return `${fieldName} has an invalid value. Please check the expected format for this field.`;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// YAML Document Navigation (with nested step support)
// ═══════════════════════════════════════════════════════════════════════════

/** Keys that contain nested step arrays */
const NESTED_STEP_KEYS = ['steps', 'else', 'fallback'];

interface StepInfo {
  stepType: string;
  pathWithinWith: PropertyKey[];
}

/**
 * Finds step info from a path, handling nested steps.
 * Returns the step type and the path within the 'with' block.
 */
function findStepInfoFromPath(path: PropertyKey[], yamlDocument?: Document): StepInfo | null {
  if (!yamlDocument?.contents || !YAML.isMap(yamlDocument.contents)) {
    return null;
  }

  // Find the 'with' index in the path
  const withIndex = path.indexOf('with');
  if (withIndex === -1) return null;

  // The path before 'with' should lead to a step
  const pathToStep = path.slice(0, withIndex);
  const pathWithinWith = path.slice(withIndex + 1);

  // Navigate to the step and get its type
  const stepType = getStepTypeAtYamlPath(pathToStep, yamlDocument);
  if (!stepType) return null;

  return { stepType, pathWithinWith: pathWithinWith.map(String) };
}

/**
 * Gets the step type from YAML document at a given path.
 * Handles nested steps: steps[0].steps[1] → finds step at steps[0].steps[1]
 */
export function getStepTypeAtPath(path: PropertyKey[], yamlDocument?: Document): string | null {
  if (!yamlDocument?.contents || !YAML.isMap(yamlDocument.contents)) {
    return null;
  }

  // Find the 'with' index to determine the path to the step
  const withIndex = path.indexOf('with');
  const pathToStep = withIndex !== -1 ? path.slice(0, withIndex) : path;

  return getStepTypeAtYamlPath(pathToStep, yamlDocument);
}

/**
 * Navigates the YAML document to find the step type at the given path.
 */
function getStepTypeAtYamlPath(pathToStep: PropertyKey[], yamlDocument: Document): string | null {
  try {
    let current: any = yamlDocument.contents;

    for (let i = 0; i < pathToStep.length; i++) {
      const segment = pathToStep[i];

      if (YAML.isMap(current)) {
        // Find the key in the map
        const item = current.items.find(
          (pair: any) => YAML.isScalar(pair.key) && pair.key.value === segment
        );
        if (!item) return null;
        current = item.value;
      } else if (YAML.isSeq(current)) {
        // Navigate into array by index
        const index = typeof segment === 'number' ? segment : parseInt(String(segment), 10);
        if (isNaN(index) || index < 0 || index >= current.items.length) return null;
        current = current.items[index];
      } else {
        return null;
      }
    }

    // Now 'current' should be a step node - find its 'type' field
    if (YAML.isMap(current)) {
      const typeItem = current.items.find(
        (pair: any) => YAML.isScalar(pair.key) && pair.key.value === 'type'
      );
      if (typeItem && YAML.isScalar(typeItem.value)) {
        return String(typeItem.value.value);
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Connector Schema Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets the params schema for a given connector/step type
 */
function getConnectorParamsSchema(stepType: string): z.ZodType | null {
  try {
    const allConnectors = getAllConnectors();
    const connector = allConnectors.find((c: any) => c.type === stepType);
    return connector?.paramsSchema ?? null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Schema Analysis Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyzes a union schema to extract user-friendly option descriptions
 */
function analyzeUnionSchema(
  unionSchema: z.ZodUnion<any>
): Array<{ name: string; description: string }> {
  const options: Array<{ name: string; description: string }> = [];

  for (const option of unionSchema.def.options) {
    const optionInfo = analyzeUnionOption(option);
    options.push(optionInfo);
  }

  return options;
}

function analyzeUnionOption(option: z.ZodType): { name: string; description: string } {
  if (option instanceof z.ZodObject) {
    const shape = option.def.shape;
    const discriminator = findDiscriminatorInShape(shape);

    if (discriminator) {
      const otherProps = Object.keys(shape)
        .filter((key) => key !== discriminator.key && !isOptionalSchema(shape[key]))
        .sort();

      let description = `type: "${discriminator.value}"`;
      if (otherProps.length > 0) {
        description += `\n    other props: ${otherProps.join(', ')}`;
      }
      return { name: String(discriminator.value), description };
    }

    const requiredProps = Object.keys(shape)
      .filter((key) => !isOptionalSchema(shape[key]))
      .sort();

    return {
      name: `object_with_${requiredProps.join('_')}`,
      description: `props: ${requiredProps.join(', ')}`,
    };
  }

  if (option instanceof z.ZodLiteral) {
    return {
      name: String(option.value),
      description: `literal value: ${JSON.stringify(option.value)}`,
    };
  }

  if (option instanceof z.ZodString) return { name: 'string', description: 'string value' };
  if (option instanceof z.ZodNumber) return { name: 'number', description: 'number value' };
  if (option instanceof z.ZodBoolean) return { name: 'boolean', description: 'boolean value' };

  const typeName = getTypeDescriptionForError(option);
  return { name: typeName, description: `${typeName} type` };
}

function findDiscriminatorInShape(
  shape: Record<string, z.ZodType>
): { key: string; value: any } | null {
  for (const [key, schema] of Object.entries(shape)) {
    if (schema instanceof z.ZodLiteral) {
      return { key, value: schema.value };
    }
  }
  return null;
}

function isOptionalSchema(schema: z.ZodType): boolean {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Unified Schema Error Message Generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a user-friendly error message for any schema type.
 * Handles unions, objects, arrays, and primitives uniformly.
 */
function generateSchemaErrorMessage(fieldName: string, schema: z.ZodType): string | null {
  try {
    // Unwrap optional/nullable/default wrappers
    const unwrappedSchema = unwrapSchema(schema);

    // Handle unions with special "oneOf" formatting
    if (unwrappedSchema instanceof z.ZodUnion) {
      return generateUnionErrorMessage(fieldName, unwrappedSchema);
    }

    // Handle objects with property list
    if (unwrappedSchema instanceof z.ZodObject) {
      return `${fieldName} should be ${getObjectPropertiesDescription(unwrappedSchema)}`;
    }

    // For all other types, use the type description
    const expectedType = getTypeDescriptionForError(unwrappedSchema);
    return `${fieldName} should be ${expectedType}`;
  } catch {
    return null;
  }
}

/**
 * Generates error message for union types with "oneOf" format.
 */
function generateUnionErrorMessage(fieldName: string, unionSchema: z.ZodUnion<any>): string | null {
  const unionOptions = analyzeUnionSchema(unionSchema);
  if (unionOptions.length === 0) return null;

  const optionsList = unionOptions.map((opt) => `  - ${opt.description}`).join('\n');
  return `${fieldName} should be oneOf:\n${optionsList}`;
}

/**
 * Unwraps optional/nullable/default wrappers to get the core schema.
 */
function unwrapSchema(schema: z.ZodType): z.ZodType {
  let current = schema;

  while (current) {
    if (current instanceof z.ZodOptional) {
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodNullable) {
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodDefault) {
      current = current.unwrap() as z.ZodType;
    } else {
      break;
    }
  }

  return current;
}

function getObjectPropertiesDescription(
  fieldSchema: z.ZodObject,
  maxProperties: number = 5
): string {
  const allProperties = Object.keys(fieldSchema.def.shape);
  const propsText = allProperties.slice(0, maxProperties).join(', ');
  const suffix = allProperties.length > maxProperties ? '...' : '';
  return `an object with properties: ${propsText}${suffix}`;
}

export function getTypeDescriptionForError(schema: z.ZodType): string {
  return getDetailedTypeDescription(schema, {
    detailed: true,
    maxDepth: 3,
    showOptional: false,
    includeDescriptions: false,
  });
}
