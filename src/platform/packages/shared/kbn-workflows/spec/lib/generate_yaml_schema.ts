/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  BaseConnectorStepSchema,
  getForEachStepSchema,
  getHttpStepSchema,
  getIfStepSchema,
  getMergeStepSchema,
  getOnFailureStepSchema,
  getParallelStepSchema,
  getWorkflowSettingsSchema,
  WaitStepSchema,
  WorkflowSchema,
} from '../schema';

export interface ConnectorContract {
  type: string;
  paramsSchema: z.ZodType;
  connectorIdRequired?: boolean;
  outputSchema: z.ZodType;
  description?: string;
}

export interface InternalConnectorContract extends ConnectorContract {
  /** HTTP method(s) for this API endpoint */
  methods?: string[];
  /** URL pattern(s) for this API endpoint */
  patterns?: string[];
  /** Whether this is an internal connector with hardcoded endpoint details */
  isInternal?: boolean;
  /** Documentation URL for this API endpoint */
  documentation?: string | null;
  /** Parameter type metadata for proper request building */
  parameterTypes?: {
    pathParams?: string[];
    urlParams?: string[];
    bodyParams?: string[];
  };
}

function generateStepSchemaForConnector(
  connector: ConnectorContract,
  stepSchema: z.ZodType,
  loose: boolean = false
) {
  return BaseConnectorStepSchema.extend({
    type: z.literal(connector.type),
    'connector-id': connector.connectorIdRequired ? z.string() : z.string().optional(),
    with: connector.paramsSchema,
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });
}

function createRecursiveStepSchema(
  connectors: ConnectorContract[],
  loose: boolean = false
): z.ZodType {
  const stepSchema: z.ZodType = z.lazy(() => {
    // Create step schemas with the recursive reference
    const forEachSchema = getForEachStepSchema(stepSchema, loose);
    const ifSchema = getIfStepSchema(stepSchema, loose);
    const parallelSchema = getParallelStepSchema(stepSchema, loose);
    const mergeSchema = getMergeStepSchema(stepSchema, loose);
    const httpSchema = getHttpStepSchema(stepSchema, loose);
    const connectorSchemas = connectors.map((c) =>
      generateStepSchemaForConnector(c, stepSchema, loose)
    );

    // Return discriminated union with all step types
    // This creates proper JSON schema validation that Monaco YAML can handle
    return z.discriminatedUnion('type', [
      forEachSchema,
      ifSchema,
      parallelSchema,
      mergeSchema,
      WaitStepSchema,
      httpSchema,
      ...connectorSchemas,
    ]);
  });

  return stepSchema;
}

export function generateYamlSchemaFromConnectors(
  connectors: ConnectorContract[],
  loose: boolean = false
) {
  const recursiveStepSchema = createRecursiveStepSchema(connectors, loose);

  if (loose) {
    return WorkflowSchema.partial().extend({
      steps: z.array(recursiveStepSchema).optional(),
    });
  }

  return WorkflowSchema.extend({
    settings: getWorkflowSettingsSchema(recursiveStepSchema, loose).optional(),
    steps: z.array(recursiveStepSchema),
  });
}

export function getJsonSchemaFromYamlSchema(yamlSchema: z.ZodType) {
  // Generate the full schema as before - this should work and give us the 7MB schema
  const jsonSchema = zodToJsonSchema(yamlSchema, {
    name: 'WorkflowSchema',
    target: 'jsonSchema7',
  });

  // Fix the schema to make it valid for JSON Schema validators
  return fixInvalidJsonSchema(jsonSchema);
}

function fixInvalidJsonSchema(schema: any): any {
  const schemaString = JSON.stringify(schema);
  let fixedSchemaString = schemaString;

  // Fix 1: Remove duplicate enum values (the main issue causing validation failure)
  // This regex finds enum arrays and removes duplicates
  fixedSchemaString = fixedSchemaString.replace(
    /"enum":\s*\[([^\]]+)\]/g,
    (match, enumValues) => {
      try {
        // Parse the enum values and remove duplicates
        const values = JSON.parse(`[${enumValues}]`);
        const uniqueValues = [...new Set(values)];
        return `"enum":${JSON.stringify(uniqueValues)}`;
      } catch (e) {
        // If parsing fails, return original
        return match;
      }
    }
  );

  // Fix 2: Apply our additionalProperties fix but more carefully
  try {
    const tempSchema = JSON.parse(fixedSchemaString);
    fixAdditionalPropertiesInSchema(tempSchema);
    
    // Validate the fixed schema
    const Ajv = require('ajv');
    const ajv = new Ajv({ strict: false, validateFormats: false });
    ajv.compile(tempSchema);
    
    console.log('✅ Generated valid JSON Schema for Monaco');
    return tempSchema;
  } catch (error) {
    console.warn('⚠️ Schema validation failed, using basic fallback:', error.message);
    
    // Last resort: return a very basic schema that at least works
    return createBasicWorkflowSchema();
  }
}

function createBasicWorkflowSchema(): any {
  return {
    "$ref": "#/definitions/WorkflowSchema",
    "definitions": {
      "WorkflowSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "version": {
            "type": "string",
            "const": "1",
            "default": "1"
          },
          "name": {
            "type": "string",
            "minLength": 1
          },
          "description": {
            "type": "string"
          },
          "steps": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "name": { "type": "string", "minLength": 1 },
                "type": { "type": "string" },
                "with": { "type": "object" },
                "if": { "type": "string" },
                "foreach": { "type": "string" }
              },
              "required": ["name", "type"]
            },
            "minItems": 1
          }
        },
        "required": ["version", "name", "steps"]
      }
    }
  };
}

function fixAdditionalPropertiesInSchema(obj: any, insideAllOf = false): void {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => fixAdditionalPropertiesInSchema(item, insideAllOf));
    return;
  }

  // Check if this object is an allOf array
  if (obj.allOf && Array.isArray(obj.allOf)) {
    // Process items inside allOf with the flag set to true
    obj.allOf.forEach((item: any) => fixAdditionalPropertiesInSchema(item, true));
  }

  // If this is an object type and we're not inside an allOf, add additionalProperties: false
  if (obj.type === 'object' && !insideAllOf && !('additionalProperties' in obj)) {
    obj.additionalProperties = false;
  }

  // Recursively process all properties
  Object.keys(obj).forEach(key => {
    if (key !== 'allOf') {
      fixAdditionalPropertiesInSchema(obj[key], insideAllOf);
    }
  });
}

function fixBrokenSchemaReferencesAndEnforceStrictValidation(schema: any): any {
  const schemaString = JSON.stringify(schema);
  let fixedSchemaString = schemaString;

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
  // BUT: we must be careful not to add it to objects inside allOf arrays

  // First, replace any existing "additionalProperties": true with false
  fixedSchemaString = fixedSchemaString.replace(
    /"additionalProperties":\s*true/g,
    '"additionalProperties": false'
  );

  // Then, add additionalProperties: false to objects that don't have it
  // BUT we need to avoid objects that are inside allOf arrays to prevent conflicts
  // We'll use a more sophisticated approach to parse and fix the schema
  try {
    const tempSchema = JSON.parse(fixedSchemaString);
    fixAdditionalPropertiesInSchema(tempSchema);
    fixedSchemaString = JSON.stringify(tempSchema);
  } catch (parseError) {
    // If parsing fails, fall back to the simple regex approach
    fixedSchemaString = fixedSchemaString.replace(
      /"type":\s*"object"(?![^}]*"additionalProperties")/g,
      '"type": "object", "additionalProperties": false'
    );
  }

  try {
    const fixedSchema = JSON.parse(fixedSchemaString);
    /*
    console.log(
      `Fixed schema size: ${Math.round((fixedSchemaString.length / 1024 / 1024) * 100) / 100}MB`
    );
    */
    return fixedSchema;
  } catch (parseError) {
    // console.warn('Failed to parse fixed schema, using original');
    return schema;
  }
}

export function getStepId(stepName: string): string {
  return stepName.toLowerCase().replace(/\s+/g, '-');
}
