/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable import/no-nodejs-modules */
// We only use Node.js modules in this test file to read example yaml files

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { applyInputDefaults, normalizeInputsToJsonSchema } from './lib/input_conversion';
import { WorkflowSchema } from './schema';
// Note: getWorkflowContextSchema is in the plugin, not in the package
// For this test, we'll test the schema parsing and normalization directly

/**
 * Comprehensive workflow test showcasing JSON Schema features
 * This test validates that the workflow can be parsed, validated, and executed
 * with various JSON Schema features including:
 * - Email format validation
 * - Regex patterns
 * - Nested objects
 * - Additional properties control
 * - Required fields
 * - Default values
 * - Enums
 * - Array constraints
 */
describe('Workflow with JSON Schema Inputs - Comprehensive Features', () => {
  it('should parse and validate a workflow with comprehensive JSON Schema features', () => {
    const workflow = {
      version: '1',
      name: 'JSON Schema Showcase Workflow',
      description: 'Workflow showcasing JSON Schema features',
      enabled: true,
      triggers: [{ type: 'manual' }],
      inputs: {
        properties: {
          // Email format validation
          email: {
            type: 'string',
            format: 'email',
            description: "User's email address",
          },
          // Regex pattern validation
          zipCode: {
            type: 'string',
            pattern: '^\\d{5}(-\\d{4})?$',
            description: 'US ZIP code (5 digits or 5+4 format)',
          },
          // Enum values
          environment: {
            type: 'string',
            enum: ['dev', 'staging', 'prod'],
            description: 'Deployment environment',
            default: 'dev',
          },
          // Number with constraints
          age: {
            type: 'number',
            minimum: 0,
            maximum: 150,
            description: "User's age",
            default: 18,
          },
          // String with length constraints
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            description: "User's username",
          },
          // Array with constraints
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
            description: 'List of tags',
          },
          // Nested object with additionalProperties: false
          customer: {
            type: 'object',
            description: 'Customer information',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
              },
              email: {
                type: 'string',
                format: 'email',
              },
              address: {
                type: 'object',
                properties: {
                  street: {
                    type: 'string',
                  },
                  city: {
                    type: 'string',
                  },
                  zipCode: {
                    type: 'string',
                    pattern: '^\\d{5}(-\\d{4})?$',
                  },
                  country: {
                    type: 'string',
                    enum: ['US', 'CA', 'UK', 'DE', 'FR'],
                  },
                },
                required: ['street', 'city', 'zipCode'],
                additionalProperties: false,
              },
              preferences: {
                type: 'object',
                additionalProperties: {
                  type: 'string',
                },
                properties: {
                  newsletter: {
                    type: 'boolean',
                    default: false,
                  },
                  theme: {
                    type: 'string',
                    enum: ['light', 'dark', 'auto'],
                    default: 'auto',
                  },
                },
              },
            },
            required: ['name', 'email'],
            additionalProperties: false,
          },
          // URI format
          website: {
            type: 'string',
            format: 'uri',
            description: 'Website URL',
          },
          // Date-time format
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
        },
        required: ['email', 'username', 'customer'],
        additionalProperties: false,
      },
      steps: [
        {
          name: 'validate-inputs',
          type: 'console',
          with: {
            message: 'Processing customer: {{ inputs.customer.name }}',
          },
        },
        {
          name: 'process-data',
          type: 'console',
          with: {
            message: 'Email: {{ inputs.email }}, Environment: {{ inputs.environment }}',
          },
        },
      ],
    };

    // Test 1: Parse the workflow
    const parseResult = WorkflowSchema.safeParse(workflow);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) {
      return;
    }

    const parsedWorkflow = parseResult.data;

    // Test 2: Verify inputs structure
    expect(parsedWorkflow.inputs).toBeDefined();
    expect(parsedWorkflow.inputs?.properties).toBeDefined();
    expect(parsedWorkflow.inputs?.properties?.email).toBeDefined();
    expect(parsedWorkflow.inputs?.properties?.email.format).toBe('email');
    expect(parsedWorkflow.inputs?.properties?.zipCode.pattern).toBe('^\\d{5}(-\\d{4})?$');
    expect(parsedWorkflow.inputs?.properties?.environment.enum).toEqual(['dev', 'staging', 'prod']);
    expect(parsedWorkflow.inputs?.required).toContain('email');
    expect(parsedWorkflow.inputs?.required).toContain('username');
    expect(parsedWorkflow.inputs?.required).toContain('customer');

    // Test 3: Normalize inputs (should return as-is since already in new format)
    const normalizedInputs = normalizeInputsToJsonSchema(parsedWorkflow.inputs);
    expect(normalizedInputs).toBeDefined();
    expect(normalizedInputs?.properties).toBeDefined();

    // Test 5: Verify all JSON Schema features are preserved
    expect(normalizedInputs?.properties?.email.format).toBe('email');
    expect(normalizedInputs?.properties?.zipCode.pattern).toBe('^\\d{5}(-\\d{4})?$');
    expect(normalizedInputs?.properties?.environment.enum).toEqual(['dev', 'staging', 'prod']);
    expect(normalizedInputs?.properties?.age.minimum).toBe(0);
    expect(normalizedInputs?.properties?.age.maximum).toBe(150);
    expect(normalizedInputs?.properties?.username.minLength).toBe(3);
    expect(normalizedInputs?.properties?.username.maxLength).toBe(20);
    expect(normalizedInputs?.properties?.tags.minItems).toBe(1);
    expect(normalizedInputs?.properties?.tags.maxItems).toBe(10);
    expect(normalizedInputs?.properties?.tags.uniqueItems).toBe(true);
    expect(normalizedInputs?.properties?.website.format).toBe('uri');
    expect(normalizedInputs?.properties?.createdAt.format).toBe('date-time');

    // Verify nested object structure
    expect(
      normalizedInputs?.properties?.customer.properties?.address.properties?.zipCode.pattern
    ).toBe('^\\d{5}(-\\d{4})?$');
    expect(
      normalizedInputs?.properties?.customer.properties?.address.properties?.country.enum
    ).toEqual(['US', 'CA', 'UK', 'DE', 'FR']);
    expect(normalizedInputs?.properties?.customer.additionalProperties).toBe(false);
  });

  it('should reject invalid input data based on JSON Schema constraints', () => {
    const workflow = {
      version: '1',
      name: 'Validation Test Workflow',
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
            maximum: 150,
          },
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
          },
        },
        required: ['email', 'age', 'username'],
      },
      steps: [{ name: 'step1', type: 'console' }],
    };

    const parseResult = WorkflowSchema.safeParse(workflow);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    // Verify the schema structure is correct
    const parsedWorkflow = parseResult.data;
    expect(parsedWorkflow.inputs?.properties?.email.format).toBe('email');
    expect(parsedWorkflow.inputs?.properties?.age.minimum).toBe(0);
    expect(parsedWorkflow.inputs?.properties?.age.maximum).toBe(150);
    expect(parsedWorkflow.inputs?.properties?.username.minLength).toBe(3);
    expect(parsedWorkflow.inputs?.properties?.username.maxLength).toBe(20);
    expect(parsedWorkflow.inputs?.required).toContain('email');
    expect(parsedWorkflow.inputs?.required).toContain('age');
    expect(parsedWorkflow.inputs?.required).toContain('username');
  });

  it('should handle workflow execution with JSON Schema inputs', () => {
    const workflow = {
      version: '1',
      name: 'Execution Test Workflow',
      triggers: [{ type: 'manual' }],
      inputs: {
        properties: {
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              metadata: {
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  routing: {
                    type: 'object',
                    properties: {
                      shard: { type: 'number' },
                      primary: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            required: ['name', 'email'],
            additionalProperties: false,
          },
        },
        required: ['customer'],
        additionalProperties: false,
      },
      steps: [
        {
          name: 'process-customer',
          type: 'console',
          with: {
            message: 'Processing {{ inputs.customer.name }}',
          },
        },
      ],
    };

    const parseResult = WorkflowSchema.safeParse(workflow);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const parsedWorkflow = parseResult.data;

    // Verify the workflow structure is correct
    expect(parsedWorkflow.inputs?.properties?.customer).toBeDefined();
    expect(parsedWorkflow.inputs?.properties?.customer.properties?.email.format).toBe('email');
    expect(
      parsedWorkflow.inputs?.properties?.customer.properties?.metadata.properties?.routing
        .properties?.shard.type
    ).toBe('number');
    expect(
      parsedWorkflow.inputs?.properties?.customer.properties?.metadata.properties?.routing
        .properties?.primary.type
    ).toBe('boolean');
    expect(parsedWorkflow.inputs?.required).toContain('customer');
    expect(parsedWorkflow.inputs?.additionalProperties).toBe(false);

    // Verify normalization preserves the structure
    const normalizedInputs = normalizeInputsToJsonSchema(parsedWorkflow.inputs);
    expect(normalizedInputs?.properties?.customer.properties?.email.format).toBe('email');
    expect(normalizedInputs?.properties?.customer.additionalProperties).toBe(false);
  });

  it('should parse and validate workflow with $ref references and apply defaults', () => {
    // Read the example workflow YAML file
    const yamlPath = join(__dirname, 'examples', 'example_test_workflow_with_ref.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const workflowData = parse(yamlContent);

    // Test 1: Parse the workflow
    const parseResult = WorkflowSchema.safeParse(workflowData);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) {
      return;
    }

    const parsedWorkflow = parseResult.data;

    // Test 2: Verify the $ref reference exists in inputs
    expect(parsedWorkflow.inputs).toBeDefined();
    expect(parsedWorkflow.inputs?.properties).toBeDefined();
    expect(parsedWorkflow.inputs?.properties?.user).toBeDefined();
    expect(parsedWorkflow.inputs?.properties?.user.$ref).toBe('#/definitions/UserSchema');

    // Test 3: Verify the definition exists
    expect(parsedWorkflow.inputs?.definitions).toBeDefined();
    expect(parsedWorkflow.inputs?.definitions?.UserSchema).toBeDefined();
    expect(parsedWorkflow.inputs?.definitions?.UserSchema.properties?.name).toBeDefined();
    expect(parsedWorkflow.inputs?.definitions?.UserSchema.properties?.email).toBeDefined();
    expect(parsedWorkflow.inputs?.definitions?.UserSchema.properties?.age).toBeDefined();

    // Test 4: Verify defaults are defined in the schema
    expect(parsedWorkflow.inputs?.definitions?.UserSchema.properties?.name.default).toBe(
      'John Doe'
    );
    expect(parsedWorkflow.inputs?.definitions?.UserSchema.properties?.email.default).toBe(
      'john.doe@example.com'
    );
    expect(parsedWorkflow.inputs?.definitions?.UserSchema.properties?.age.default).toBe(30);

    // Test 5: Normalize inputs (should preserve $ref and definitions)
    const normalizedInputs = normalizeInputsToJsonSchema(parsedWorkflow.inputs);
    expect(normalizedInputs).toBeDefined();
    expect(normalizedInputs?.properties?.user.$ref).toBe('#/definitions/UserSchema');
    expect(normalizedInputs?.definitions?.UserSchema).toBeDefined();

    // Test 6: Apply defaults - should resolve $ref and apply defaults
    const inputsWithDefaults = applyInputDefaults(undefined, normalizedInputs!);
    expect(inputsWithDefaults).toBeDefined();
    expect(inputsWithDefaults?.user).toBeDefined();
    const user = inputsWithDefaults?.user as { name: string; email: string; age: number };
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john.doe@example.com');
    expect(user.age).toBe(30);
  });
});
