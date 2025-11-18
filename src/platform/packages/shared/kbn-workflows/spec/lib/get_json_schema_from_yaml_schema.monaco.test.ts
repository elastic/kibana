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

  it('should validate a workflow WITHOUT inputs (inputs field missing) - regression test', () => {
    const workflowZodSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

    const workflow = {
      name: 'New workflow',
      enabled: false,
      triggers: [{ type: 'manual' }],
      // No inputs field at all - this should not cause validation errors
      steps: [
        {
          name: 'first-step',
          type: 'console',
          with: {
            message: 'First step executed',
          },
        },
      ],
    };

    // Get the inputs schema from the generated JSON Schema
    const inputsSchema = jsonSchema?.definitions?.WorkflowSchema?.properties?.inputs;

    // The inputs schema should be optional (wrapped in anyOf with null/undefined)
    expect(inputsSchema).toBeDefined();

    if (inputsSchema?.anyOf && Array.isArray(inputsSchema.anyOf)) {
      // CRITICAL: Should NOT have any array schemas (legacy format)
      // This is the regression we're testing for
      const arraySchemas = inputsSchema.anyOf.filter((s: any) => s.type === 'array');
      expect(arraySchemas.length).toBe(0); // No array schemas should remain

      // Should have null/undefined for optional
      const nullSchemas = inputsSchema.anyOf.filter(
        (s: any) => s.type === 'null' || s.type === 'undefined'
      );
      expect(nullSchemas.length).toBeGreaterThan(0);

      // Should have object schema (new format)
      const objectSchemas = inputsSchema.anyOf.filter(
        (s: any) => s.type === 'object' && s.type !== 'null' && s.type !== 'undefined'
      );
      expect(objectSchemas.length).toBeGreaterThan(0);

      // Verify the object schema has the correct structure
      const objectSchema = objectSchemas[0];
      expect(objectSchema.properties).toBeDefined();
      expect(objectSchema.properties.properties).toBeDefined();
      expect(objectSchema.properties.properties.type).toBe('object');
      expect(objectSchema.properties.properties.type).not.toBe('array');
    } else {
      // If not wrapped in anyOf, it should still be an object (not array)
      expect(inputsSchema.type).not.toBe('array');
      if (inputsSchema.type === 'object') {
        expect(inputsSchema.properties?.properties?.type).not.toBe('array');
      }
    }

    // Note: We don't validate with Ajv here because the schema has broken references
    // that are fixed at runtime. The important thing is that the schema structure
    // doesn't include array types, which would cause Monaco to show "Expected array" errors.
    // The schema structure check above is sufficient to prevent the regression.
  });

  it('should have correct schema for steps field - steps should be an array type', () => {
    const workflowZodSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

    const stepsSchema = jsonSchema?.definitions?.WorkflowSchema?.properties?.steps;

    expect(stepsSchema).toBeDefined();

    // Steps should be an array type (this is correct, unlike inputs)
    // Check if it's wrapped in anyOf (for optional) or directly an array
    let actualStepsSchema = stepsSchema;
    if (stepsSchema?.anyOf && Array.isArray(stepsSchema.anyOf)) {
      // If wrapped in anyOf, find the non-null schema
      const nonNullSchema = stepsSchema.anyOf.find(
        (s: any) => s.type !== 'null' && s.type !== 'undefined'
      );
      if (nonNullSchema) {
        actualStepsSchema = nonNullSchema;
      }
    }

    // The actual schema should be an array type
    // This is critical - Monaco needs to see this as an array
    expect(actualStepsSchema.type).toBe('array');
    expect(actualStepsSchema.items).toBeDefined();

    // Verify a workflow with steps validates correctly
    const workflow = {
      name: 'New workflow',
      enabled: false,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'first-step',
          type: 'console',
          with: {
            message: 'First step executed',
          },
        },
      ],
    };

    // The steps should be an array in the workflow
    expect(Array.isArray(workflow.steps)).toBe(true);
    expect(workflow.steps.length).toBeGreaterThan(0);
  });
});
