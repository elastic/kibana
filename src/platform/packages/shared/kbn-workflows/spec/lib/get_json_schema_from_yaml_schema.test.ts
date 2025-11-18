/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getJsonSchemaFromYamlSchema } from './get_json_schema_from_yaml_schema';
import { WorkflowSchema } from '../schema';

describe('getJsonSchemaFromYamlSchema - Inputs Schema Fix', () => {
  it('should generate correct JSON Schema structure for inputs field', () => {
    // Generate schema from WorkflowSchema (which uses WorkflowInputsJsonSchema)
    const workflowZodSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

    // Check that the inputs schema has the correct structure
    // The schema might be at top level or in allOf structure (from .pipe())
    const workflowSchema = jsonSchema?.definitions?.WorkflowSchema;
    expect(workflowSchema).toBeDefined();

    let inputsSchema = workflowSchema?.properties?.inputs;

    // If inputs is not at top level, check inside allOf (from .pipe() transformation)
    if (!inputsSchema && workflowSchema?.allOf && Array.isArray(workflowSchema.allOf)) {
      for (const allOfItem of workflowSchema.allOf) {
        if (allOfItem?.properties?.inputs) {
          inputsSchema = allOfItem.properties.inputs;
          break;
        }
      }
    }

    expect(inputsSchema).toBeDefined();

    // Helper to check if a schema has the correct structure
    const checkSchemaStructure = (schema: any) => {
      // The schema should have properties that define the JSON Schema structure
      // This means it should have properties.properties, properties.required, etc.
      if (schema.properties) {
        // Good - it has the properties structure
        expect(schema.properties.properties).toBeDefined();
        expect(schema.properties.required).toBeDefined();
        expect(schema.properties.additionalProperties).toBeDefined();
        return true;
      }
      return false;
    };

    // If inputs is optional, it might be wrapped in anyOf
    if (inputsSchema?.anyOf) {
      // Find the non-null schema
      const nonNullSchema = inputsSchema.anyOf.find(
        (s: any) => s.type !== 'null' && s.type !== 'undefined'
      );
      expect(nonNullSchema).toBeDefined();
      expect(checkSchemaStructure(nonNullSchema)).toBe(true);
    } else {
      // Not wrapped in anyOf, check directly
      expect(checkSchemaStructure(inputsSchema)).toBe(true);
    }
  });

  it('should validate a workflow with JSON Schema inputs', () => {
    const workflow = {
      version: '1',
      name: 'Test Workflow',
      triggers: [{ type: 'manual' }],
      inputs: {
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          age: {
            type: 'number',
            minimum: 0,
          },
        },
        required: ['email'],
        additionalProperties: false,
      },
      steps: [{ name: 'step1', type: 'console' }],
    };

    const parseResult = WorkflowSchema.safeParse(workflow);
    expect(parseResult.success).toBe(true);
  });
});
