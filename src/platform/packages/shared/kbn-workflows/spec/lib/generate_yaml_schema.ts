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
  
  // Fix broken $ref paths and enforce strict validation (additionalProperties: false)
  return fixBrokenSchemaReferencesAndEnforceStrictValidation(jsonSchema);
}

function createYamlSchemaWithoutProblematicConnectors() {
  // Import the connector generation functions
  const { GENERATED_KIBANA_CONNECTORS } = require('../../common/generated_kibana_connectors');
  
  // Filter out connectors that contain problematic schemas
  const safeConnectors = GENERATED_KIBANA_CONNECTORS.filter((connector: any) => {
    const connectorString = JSON.stringify(connector);
    return !connectorString.includes('AlertSuppression') && 
           !connectorString.includes('Security_Detections_API') &&
           !connectorString.includes('alert_suppression');
  });
  
  console.log(`Using ${safeConnectors.length} safe connectors out of ${GENERATED_KIBANA_CONNECTORS.length} total`);
  
  // Generate schema with safe connectors only
  return generateYamlSchemaFromConnectors(safeConnectors);
}

function isSchemaValidForValidation(schema: any): boolean {
  try {
    // Check if schema has proper structure for validation
    if (!schema || typeof schema !== 'object') return false;
    if (!schema.properties || typeof schema.properties !== 'object') return false;
    
    // Check for essential workflow properties
    const requiredProps = ['version', 'name', 'steps'];
    for (const prop of requiredProps) {
      if (!schema.properties[prop]) return false;
    }
    
    // Check if steps array has proper validation structure
    const stepsSchema = schema.properties.steps;
    if (!stepsSchema || stepsSchema.type !== 'array' || !stepsSchema.items) return false;
    
    // Verify no broken $ref paths remain
    const schemaString = JSON.stringify(schema);
    const brokenRefs = schemaString.match(/"\$ref":"[^"]*\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]*"/g);
    
    return !brokenRefs || brokenRefs.length === 0;
  } catch (error) {
    return false;
  }
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
  
  // First, replace any existing "additionalProperties": true with false
  fixedSchemaString = fixedSchemaString.replace(
    /"additionalProperties":\s*true/g,
    '"additionalProperties": false'
  );
  
  // Then, add additionalProperties: false to objects that don't have it
  fixedSchemaString = fixedSchemaString.replace(
    /"type":\s*"object"(?![^}]*"additionalProperties")/g,
    '"type": "object", "additionalProperties": false'
  );
  
  try {
    const fixedSchema = JSON.parse(fixedSchemaString);
    console.log(`Fixed schema size: ${Math.round(fixedSchemaString.length / 1024 / 1024 * 100) / 100}MB`);
    return fixedSchema;
  } catch (parseError) {
    console.warn('Failed to parse fixed schema, using original');
    return schema;
  }
}

function createEnhancedSimplifiedWorkflowSchema(): any {
  return {
    type: 'object',
    properties: {
      version: {
        type: 'string',
        const: '1',
        description: 'Workflow schema version'
      },
      name: {
        type: 'string',
        minLength: 1,
        description: 'Workflow name'
      },
      description: {
        type: 'string',
        description: 'Workflow description'
      },
      enabled: {
        type: 'boolean',
        description: 'Whether the workflow is enabled'
      },
      triggers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['manual', 'scheduled', 'alert'],
              description: 'Trigger type'
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the trigger is enabled'
            },
            schedule: {
              type: 'string',
              description: 'Cron expression for scheduled triggers'
            }
          },
          required: ['type'],
          additionalProperties: false
        }
      },
      steps: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              pattern: '^[a-zA-Z0-9_-]+$',
              description: 'Step name (alphanumeric, underscore, hyphen only)'
            },
            type: {
              type: 'string',
              minLength: 1,
              description: 'Step type (connector or built-in like console, http, if, foreach, parallel, merge, wait)'
            },
            with: {
              type: 'object',
              description: 'Step parameters - varies by step type',
              additionalProperties: true
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the step is enabled'
            }
          },
          required: ['name', 'type'],
          additionalProperties: false
        }
      },
      settings: {
        type: 'object',
        properties: {
          'on-failure': {
            type: 'object',
            properties: {
              retry: {
                type: 'object',
                properties: {
                  'max-attempts': { 
                    type: 'number', 
                    minimum: 1,
                    maximum: 10,
                    description: 'Maximum retry attempts'
                  },
                  delay: { 
                    type: 'string', 
                    pattern: '^\\d+(ms|[smhdw])$',
                    description: 'Delay between retries (e.g., 1s, 5m, 1h)'
                  }
                },
                required: ['max-attempts'],
                additionalProperties: false
              },
              fallback: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { 
                      type: 'string',
                      minLength: 1,
                      pattern: '^[a-zA-Z0-9_-]+$'
                    },
                    type: { 
                      type: 'string',
                      minLength: 1
                    },
                    with: { 
                      type: 'object',
                      additionalProperties: true
                    }
                  },
                  required: ['name', 'type'],
                  additionalProperties: false
                }
              }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    },
    required: ['version', 'name', 'steps'],
    additionalProperties: false
  };
}

export function getStepId(stepName: string): string {
  return stepName.toLowerCase().replace(/\s+/g, '-');
}
