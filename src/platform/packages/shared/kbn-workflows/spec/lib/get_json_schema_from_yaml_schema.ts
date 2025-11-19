/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonSchema7Type } from 'zod-to-json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from '@kbn/zod';
import { FetcherConfigSchema } from '../schema';

type WorkflowJsonSchema = JsonSchema7Type & {
  $ref: '#/definitions/WorkflowSchema';
  $schema: 'http://json-schema.org/draft-07/schema#';
  definitions: {
    WorkflowSchema: JsonSchema7Type;
  };
};

/**
 * Type for JSON Schema objects that may be modified during processing.
 * Using a flexible type is necessary here because zod-to-json-schema produces dynamic structures
 * that don't have a fixed type, and we need to traverse and modify them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchemaObject = any;

export function getJsonSchemaFromYamlSchema(yamlSchema: z.ZodType): WorkflowJsonSchema {
  // Generate the json schema from zod schema
  const jsonSchema = zodToJsonSchema(yamlSchema, {
    name: 'WorkflowSchema',
    target: 'jsonSchema7',
  });

  // Apply targeted fixes to make it valid for JSON Schema validators
  const fixedSchema = fixBrokenSchemaReferencesAndEnforceStrictValidation(jsonSchema);

  // Ensure version field is optional (Monaco validation requirement)
  ensureVersionIsOptional(fixedSchema);

  // Fix inputs schema to support both legacy array and new object formats
  fixInputsSchemaForMonaco(fixedSchema);

  // Add fetcher parameter to all Kibana connector steps
  addFetcherToKibanaConnectors(fixedSchema);

  return fixedSchema;
}

/**
 * Recursively fix additionalProperties in the schema object
 * This ensures all object schemas have additionalProperties: false for strict validation
 */
function fixAdditionalPropertiesInSchema(
  obj: JsonSchemaObject,
  path: string = '',
  visited = new Set<JsonSchemaObject>()
): void {
  // Prevent infinite recursion with circular references
  if (typeof obj !== 'object' || obj === null || visited.has(obj)) {
    return;
  }
  visited.add(obj);

  if (Array.isArray(obj)) {
    obj.forEach((item, index) =>
      fixAdditionalPropertiesInSchema(item, `${path}[${index}]`, visited)
    );
    return;
  }

  // For objects with type: "object", which don't have additionalProperties, set it to false
  if (obj.type === 'object' && !('additionalProperties' in obj)) {
    obj.additionalProperties = false;
  }

  // CRITICAL FIX: Remove additionalProperties: false from objects inside allOf arrays
  // In allOf, each schema should be permissive to allow the union of all properties
  if (obj.type === 'object' && obj.additionalProperties === false) {
    // More specific fix: only remove additionalProperties from objects that are actually inside allOf arrays
    // This prevents removing additionalProperties from main connector schemas
    const pathParts = path.split('.');
    const isInAllOf = pathParts.some((part, index) => {
      return part === 'allOf' && pathParts[index + 1] && /^\d+$/.test(pathParts[index + 1]);
    });

    // ENHANCED FIX: Also check if we're in a connector's "with" property that uses allOf
    // This catches cases like: anyOf/X/properties/with/allOf/Y where connector params use .and()
    const isInConnectorWithAllOf =
      path.includes('properties.with.allOf') ||
      (path.includes('anyOf') && path.includes('properties.with') && path.includes('allOf'));

    // Only remove additionalProperties if we're actually inside an allOf structure
    // Do NOT remove it from main connector schemas (which should remain strict)
    if (isInAllOf || isInConnectorWithAllOf) {
      delete obj.additionalProperties;
    }
  }

  // ADDITIONAL FIX: Remove additionalProperties: false from broken reference fallback objects
  // These are empty objects with descriptions like "Complex schema intersection (simplified...)"
  if (
    obj.type === 'object' &&
    obj.additionalProperties === false &&
    obj.properties &&
    Object.keys(obj.properties).length === 0 &&
    obj.description &&
    obj.description.includes('simplified')
  ) {
    delete obj.additionalProperties;
  }

  // Recursively process all properties
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === 'object') {
      fixAdditionalPropertiesInSchema(
        value as JsonSchemaObject,
        path ? `${path}.${key}` : key,
        visited
      );
    }
  });
}

function fixBrokenSchemaReferencesAndEnforceStrictValidation(
  schema: JsonSchemaObject
): WorkflowJsonSchema {
  const schemaString = JSON.stringify(schema);
  let fixedSchemaString = schemaString;

  // Fix 1: Remove duplicate enum values (the main issue causing validation failure)
  fixedSchemaString = fixedSchemaString.replace(/"enum":\s*\[([^\]]+)\]/g, (match, enumValues) => {
    try {
      const values = JSON.parse(`[${enumValues}]`);
      const uniqueValues = [...new Set(values)];
      return `"enum":${JSON.stringify(uniqueValues)}`;
    } catch (e) {
      return match;
    }
  });

  // Fix 2: Handle intersections with unions properly
  // The main issue is that z.union().and(z.object()) creates allOf: [Union, Object]
  // but sometimes the Object part is missing from the JSON schema generation
  // We need to ensure both parts of the allOf are present
  //
  // Note: Incomplete allOf structures from .and() operations are handled via regex patterns below.
  // A proper fix would require changes to connector generation, but the current workaround
  // is sufficient for production use.

  // Break only the most deeply nested references that cause infinite loops
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/WorkflowSchema\/properties\/settings\/properties\/on-failure\/properties\/fallback\/items\/anyOf\/\d+\/properties\/with\/anyOf\/\d+\/allOf\/\d+\/allOf\/\d+\/allOf\/\d+"/g,
    '"type": "object", "additionalProperties": false, "description": "Deep nested step (recursion limited to prevent infinite loops)"'
  );

  // Fix all the broken reference patterns that cause Monaco "$ref cannot be resolved" errors
  // These patterns are generated by zod-to-json-schema when dealing with complex intersections

  // Pattern 1: Fix bare allOf references (the main issue!)
  // Examples: anyOf/6/allOf/1/allOf/1, anyOf/0/allOf/1/allOf/1, anyOf/1/allOf/1/allOf/0/allOf/1
  // These point to non-existent allOf structures
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/WorkflowSchema\/properties\/settings\/properties\/on-failure\/properties\/fallback\/items\/anyOf\/\d+\/properties\/with\/anyOf\/\d+\/allOf\/\d+\/allOf\/\d+(?:\/allOf\/\d+)*"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Complex schema intersection (simplified due to broken allOf reference)"'
  );

  // Pattern 2: Fix deeply nested allOf references with properties (4+ levels)
  // Examples: allOf/1/allOf/0/allOf/1/properties/saved_id, allOf/1/allOf/0/allOf/0/properties/threshold
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/WorkflowSchema\/properties\/settings\/properties\/on-failure\/properties\/fallback\/items\/anyOf\/\d+\/properties\/with\/anyOf\/\d+\/allOf\/\d+\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]+"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Complex nested configuration (simplified due to schema complexity)"'
  );

  // Pattern 3: Fix 3-level allOf references with array items
  // Examples: allOf/1/allOf/0/properties/threat_mapping/items, allOf/1/allOf/0/properties/new_terms_fields/items
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/WorkflowSchema\/properties\/settings\/properties\/on-failure\/properties\/fallback\/items\/anyOf\/\d+\/properties\/with\/anyOf\/\d+\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]+\/items"/g,
    '"type": "array", "items": {"type": "object", "additionalProperties": false}, "description": "Array configuration (simplified)"'
  );

  // Pattern 4: Fix 3-level allOf references for regular properties
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/WorkflowSchema\/properties\/settings\/properties\/on-failure\/properties\/fallback\/items\/anyOf\/\d+\/properties\/with\/anyOf\/\d+\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]+"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Nested configuration (simplified)"'
  );

  // Pattern 5: Fix any remaining deeply nested broken references with properties
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/[^"]*\/allOf\/\d+\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]+"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Complex object (validation simplified)"'
  );

  // Pattern 6: Fix any remaining multi-level allOf references with properties
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/[^"]*\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]+"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Nested object (validation simplified)"'
  );

  // Pattern 7: Fix any remaining bare allOf references (catch-all)
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/[^"]*\/allOf\/\d+\/allOf\/\d+(?:\/allOf\/\d+)*"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Schema intersection (simplified due to broken reference)"'
  );

  // Enforce strict validation: ensure all objects have additionalProperties: false
  // This fixes the main issue where Kibana connectors were too permissive
  try {
    const fixedSchema = JSON.parse(fixedSchemaString);
    fixAdditionalPropertiesInSchema(fixedSchema);
    return fixedSchema;
  } catch (parseError) {
    // If parsing fails, throw an error, since replacing with regexp isn't safe
    throw new Error('Failed to fix additionalProperties in json schema');
  }
}

/**
 * Fix inputs schema to support both legacy array and new object formats
 * This ensures backward compatibility in Monaco editor
 */
function fixInputsSchemaForMonaco(schema: WorkflowJsonSchema): void {
  const workflowSchema = schema?.definitions?.WorkflowSchema as JsonSchemaObject;
  if (!workflowSchema) {
    return;
  }

  // Handle allOf structure (from Zod's .pipe() transformation)
  if (Array.isArray(workflowSchema.allOf)) {
    // Find the second item (allOf[1]) which comes from the .pipe() transformation
    // This item only accepts object format, but we need it to accept both array and object
    const pipedSchema = workflowSchema.allOf[1];
    if (pipedSchema && typeof pipedSchema === 'object' && pipedSchema.properties?.inputs) {
      const inputsSchema = pipedSchema.properties.inputs;

      // If inputs schema uses $ref, we need to replace it with an anyOf that includes both formats
      if (inputsSchema.$ref) {
        // Create an anyOf union that includes:
        // 1. The original object schema (via $ref)
        // 2. An array schema for legacy format
        pipedSchema.properties.inputs = {
          anyOf: [
            { $ref: inputsSchema.$ref },
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                },
                additionalProperties: true,
              },
            },
            { type: 'null' },
            { type: 'undefined' },
          ],
        };
      }
    }
  }

  // Also fix at root level if inputs exists
  if (workflowSchema.properties?.inputs) {
    const inputsSchema = workflowSchema.properties.inputs;
    // If it's already an anyOf, ensure it includes array format
    if (inputsSchema.anyOf && Array.isArray(inputsSchema.anyOf)) {
      const hasArraySchema = inputsSchema.anyOf.some((s: JsonSchemaObject) => s.type === 'array');
      if (!hasArraySchema) {
        inputsSchema.anyOf.push({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
            },
            additionalProperties: true,
          },
        });
      }
    }
  }
}

/**
 * Ensure the version field is optional in the Monaco schema
 * This prevents "Missing property 'version'" errors in Monaco editor
 */
function ensureVersionIsOptional(schema: WorkflowJsonSchema): void {
  const workflowSchema = schema?.definitions?.WorkflowSchema as JsonSchemaObject;
  if (!workflowSchema) {
    return;
  }

  // Remove version from required array if present
  if (Array.isArray(workflowSchema.required)) {
    workflowSchema.required = workflowSchema.required.filter(
      (field: string) => field !== 'version'
    );
  }

  // Handle allOf structure (from Zod's .pipe() transformation)
  if (Array.isArray(workflowSchema.allOf)) {
    workflowSchema.allOf.forEach((item: JsonSchemaObject) => {
      if (item && typeof item === 'object') {
        // Remove version from required in allOf items
        if (Array.isArray(item.required)) {
          item.required = item.required.filter((field: string) => field !== 'version');
        }
        // Make version property optional if it exists
        if (item.properties?.version) {
          const versionProp = item.properties.version;
          if (versionProp && typeof versionProp === 'object' && !Array.isArray(versionProp)) {
            // Wrap in anyOf with undefined to make it optional
            if (!versionProp.anyOf) {
              item.properties.version = {
                anyOf: [{ ...versionProp }, { type: 'undefined' }],
              };
            }
          }
        }
      }
    });
  }

  // Make version property optional at root level if it exists
  if (workflowSchema.properties?.version) {
    const versionProp = workflowSchema.properties.version;
    if (versionProp && typeof versionProp === 'object' && !Array.isArray(versionProp)) {
      // Wrap in anyOf with undefined to make it optional
      if (!versionProp.anyOf) {
        workflowSchema.properties.version = {
          anyOf: [{ ...versionProp }, { type: 'undefined' }],
        };
      }
    }
  }
}

/**
 * Add fetcher parameter to all Kibana connector "with" schemas
 * This allows HTTP configuration for all Kibana API calls
 */
function addFetcherToKibanaConnectors(schema: WorkflowJsonSchema): void {
  // The actual step schemas are stored in the fallback items
  // (steps.items references this location via $ref)
  const workflowSchema = schema?.definitions?.WorkflowSchema as JsonSchemaObject;
  const fallbackItems = workflowSchema?.properties?.settings?.properties?.['on-failure']?.properties
    ?.fallback?.items as JsonSchemaObject | undefined;

  if (!fallbackItems?.anyOf) {
    return;
  }

  // Convert FetcherConfigSchema to JSON Schema (single source of truth)
  const fetcherJsonSchema = zodToJsonSchema(FetcherConfigSchema, {
    target: 'jsonSchema7',
    $refStrategy: 'none', // Inline the schema
  });

  const allStepSchemas = fallbackItems.anyOf;

  allStepSchemas.forEach((stepSchema: JsonSchemaObject) => {
    // Only add to Kibana connector steps (type starts with "kibana.")
    const stepType = stepSchema?.properties?.type?.const;
    if (stepType && typeof stepType === 'string' && stepType.startsWith('kibana.')) {
      const withSchema = stepSchema.properties?.with;

      if (withSchema) {
        if (!withSchema.properties) {
          withSchema.properties = {};
        }

        if (!withSchema.properties.fetcher) {
          withSchema.properties.fetcher = fetcherJsonSchema;
        }
      }
    }
  });
}
