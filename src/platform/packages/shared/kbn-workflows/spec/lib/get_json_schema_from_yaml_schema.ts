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

export function getJsonSchemaFromYamlSchema(yamlSchema: z.ZodType): WorkflowJsonSchema {
  // Generate the json schema from zod schema
  const jsonSchema = zodToJsonSchema(yamlSchema, {
    name: 'WorkflowSchema',
    target: 'jsonSchema7',
  });

  // Apply targeted fixes to make it valid for JSON Schema validators
  const fixedSchema = fixBrokenSchemaReferencesAndEnforceStrictValidation(jsonSchema);

  // Fix inputs schema: z.record() converts to additionalProperties, but we need properties
  // Convert the inputs schema from {type: "object", additionalProperties: {...}} to
  // {properties: {...}, required: [...], additionalProperties: boolean}
  fixInputsSchemaForMonaco(fixedSchema);

  // Add fetcher parameter to all Kibana connector steps
  addFetcherToKibanaConnectors(fixedSchema);

  return fixedSchema;
}

/**
 * Recursively fix additionalProperties in the schema object
 * This ensures all object schemas have additionalProperties: false for strict validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixAdditionalPropertiesInSchema(obj: any, path: string = '', visited = new Set()): void {
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
    fixAdditionalPropertiesInSchema(obj[key], path ? `${path}.${key}` : key, visited);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixBrokenSchemaReferencesAndEnforceStrictValidation(schema: any): any {
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

  // TODO: Fix incomplete allOf structures from .and() operations
  // The real fix should be in the connector generation, not hardcoded post-processing

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
 * Fix the inputs schema structure for Monaco editor
 * z.record() converts to additionalProperties, but JSON Schema needs properties
 * This converts the structure to match the expected JSON Schema format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixInputsSchemaForMonaco(schema: any): void {
  const workflowSchema = schema?.definitions?.WorkflowSchema;
  if (!workflowSchema) {
    return;
  }

  const inputsSchema = workflowSchema.properties?.inputs;
  if (!inputsSchema) {
    return;
  }

  // Helper function to fix a schema object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fixSchemaObject = (schemaObj: any): void => {
    if (!schemaObj || typeof schemaObj !== 'object') {
      return;
    }

    // Check if this schema has properties that contain a record (z.record() converts to additionalProperties)
    // We need to fix the nested structure where properties.properties is a record
    if (schemaObj.type === 'object' && schemaObj.properties) {
      const propertiesProp = schemaObj.properties.properties;

      // If properties.properties exists and has additionalProperties but no properties,
      // it means z.record() was converted incorrectly
      if (
        propertiesProp &&
        propertiesProp.type === 'object' &&
        propertiesProp.additionalProperties &&
        !propertiesProp.properties
      ) {
        const valueSchema = propertiesProp.additionalProperties;

        // Fix the properties.properties structure to allow any JSON Schema as values
        propertiesProp.additionalProperties = valueSchema;
        // Keep it as an object type that accepts any JSON Schema
      }
    }

    // Also check if the schema itself has the wrong structure (additionalProperties instead of properties)
    // This happens when z.record() is converted to JSON Schema at the top level
    if (schemaObj.type === 'object' && schemaObj.additionalProperties && !schemaObj.properties) {
      const valueSchema = schemaObj.additionalProperties;

      // Create the correct structure: an object that represents a JSON Schema
      // This allows properties (object with string keys and JSON Schema values),
      // required (array of strings), and additionalProperties (boolean or schema)
      schemaObj.properties = {
        properties: {
          type: 'object',
          additionalProperties: valueSchema, // This allows any JSON Schema as property values
          description: 'Input property definitions (JSON Schema)',
        },
        required: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of required input property names',
        },
        additionalProperties: {
          oneOf: [
            { type: 'boolean' },
            { type: 'object' }, // Can be a JSON Schema object
          ],
          description: 'Whether additional properties are allowed',
        },
      };
      schemaObj.required = [];
      delete schemaObj.additionalProperties;
    }
  };

  // Handle optional schemas (they might be wrapped in anyOf with null/undefined)
  if (inputsSchema.anyOf && Array.isArray(inputsSchema.anyOf)) {
    // Filter out array schemas (legacy format) and keep only object schemas (new format)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredAnyOf = inputsSchema.anyOf.filter((subSchema: any) => {
      // Keep null/undefined (for optional)
      if (subSchema.type === 'null' || subSchema.type === 'undefined') {
        return true;
      }
      // Remove array schemas (legacy format)
      if (subSchema.type === 'array') {
        return false;
      }
      // Keep object schemas (new format)
      return true;
    });

    // If we filtered out array schemas, update the anyOf
    if (filteredAnyOf.length !== inputsSchema.anyOf.length) {
      inputsSchema.anyOf = filteredAnyOf;
    }

    // Find and fix all non-null schemas in the anyOf
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputsSchema.anyOf.forEach((subSchema: any) => {
      if (subSchema && subSchema.type !== 'null' && subSchema.type !== 'undefined') {
        fixSchemaObject(subSchema);
      }
    });
  } else {
    // Not wrapped in anyOf, fix directly
    fixSchemaObject(inputsSchema);
  }
}

/**
 * Add fetcher parameter to all Kibana connector "with" schemas
 * This allows HTTP configuration for all Kibana API calls
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addFetcherToKibanaConnectors(schema: any): void {
  // The actual step schemas are stored in the fallback items
  // (steps.items references this location via $ref)
  const fallbackItems =
    schema?.definitions?.WorkflowSchema?.properties?.settings?.properties?.['on-failure']
      ?.properties?.fallback?.items;

  if (!fallbackItems?.anyOf) {
    return;
  }

  // Convert FetcherConfigSchema to JSON Schema (single source of truth)
  const fetcherJsonSchema = zodToJsonSchema(FetcherConfigSchema, {
    target: 'jsonSchema7',
    $refStrategy: 'none', // Inline the schema
  });

  const allStepSchemas = fallbackItems.anyOf;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allStepSchemas.forEach((stepSchema: any) => {
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
