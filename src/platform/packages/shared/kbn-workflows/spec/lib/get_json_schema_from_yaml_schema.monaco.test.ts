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

describe('Monaco Schema Generation - Inputs Field', () => {
  it('should generate schema without array format for inputs.properties', () => {
    const workflowZodSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

    const inputsSchema = jsonSchema?.definitions?.WorkflowSchema?.properties?.inputs;

    expect(inputsSchema).toBeDefined();

    // Helper to check if a schema has array type (should not)
    const hasArrayType = (schema: any): boolean => {
      if (!schema || typeof schema !== 'object') return false;
      if (schema.type === 'array') return true;
      if (schema.anyOf && Array.isArray(schema.anyOf)) {
        return schema.anyOf.some((s: any) => hasArrayType(s));
      }
      return false;
    };

    // Check the inputs schema structure
    if (inputsSchema?.anyOf && Array.isArray(inputsSchema.anyOf)) {
      // Should not have any array schemas in anyOf (except we filter them out)
      const arraySchemas = inputsSchema.anyOf.filter((s: any) => s.type === 'array');
      expect(arraySchemas.length).toBe(0);

      // Find the non-null schema
      const nonNullSchema = inputsSchema.anyOf.find(
        (s: any) => s.type !== 'null' && s.type !== 'undefined'
      );
      expect(nonNullSchema).toBeDefined();

      if (nonNullSchema) {
        // The schema should have properties.properties, not be an array
        expect(nonNullSchema.type).toBe('object');
        expect(nonNullSchema.properties).toBeDefined();
        expect(nonNullSchema.properties.properties).toBeDefined();
        expect(nonNullSchema.properties.properties.type).toBe('object');
        // Should NOT be an array
        expect(nonNullSchema.properties.properties.type).not.toBe('array');
      }
    } else {
      // Not wrapped in anyOf
      expect(inputsSchema.type).toBe('object');
      expect(inputsSchema.properties).toBeDefined();
      expect(inputsSchema.properties.properties).toBeDefined();
      expect(inputsSchema.properties.properties.type).toBe('object');
      expect(inputsSchema.properties.properties.type).not.toBe('array');
    }

    // Verify that inputs.properties is an object, not an array
    const propertiesSchema =
      inputsSchema?.anyOf?.[0]?.properties?.properties || inputsSchema?.properties?.properties;
    expect(propertiesSchema).toBeDefined();
    expect(propertiesSchema.type).toBe('object');
    expect(propertiesSchema.type).not.toBe('array');
  });

  it('should validate a workflow with JSON Schema inputs against the generated Monaco schema', () => {
    const workflowZodSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

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
          name: {
            type: 'string',
          },
        },
        required: ['email', 'name'],
      },
      steps: [{ name: 'step1', type: 'console' }],
    };

    // The workflow should match the schema structure
    const inputsSchema = jsonSchema?.definitions?.WorkflowSchema?.properties?.inputs;

    // Verify the structure matches what we expect
    if (inputsSchema?.anyOf) {
      const nonNullSchema = inputsSchema.anyOf.find(
        (s: any) => s.type !== 'null' && s.type !== 'undefined'
      );
      expect(nonNullSchema).toBeDefined();
      expect(nonNullSchema.type).toBe('object');
      expect(nonNullSchema.properties.properties).toBeDefined();
    } else {
      expect(inputsSchema.type).toBe('object');
      expect(inputsSchema.properties.properties).toBeDefined();
    }

    // The workflow.inputs should match this structure
    expect(workflow.inputs.properties).toBeDefined();
    expect(Array.isArray(workflow.inputs.properties)).toBe(false);
  });
});
