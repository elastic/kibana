/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Ajv } from 'ajv';
import type { JSONSchema } from '@kbn/zod/v4/core';
import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getWorkflowJsonSchema } from './get_workflow_json_schema';
import { GENERATED_ELASTICSEARCH_CONNECTORS } from '../../common/generated/elasticsearch_connectors.gen';

describe('getWorkflowJsonSchema / elasticsearch connectors', () => {
  it('should generate valid JSON Schema that can be compiled', () => {
    // This test ensures our generated JSON Schema is structurally valid
    // This is critical for Monaco autocomplete and validation to work properly

    // Generate the workflow schema and convert to JSON schema (this is what Monaco uses)
    const workflowSchema = generateYamlSchemaFromConnectors(GENERATED_ELASTICSEARCH_CONNECTORS);
    const jsonSchema = getWorkflowJsonSchema(workflowSchema);

    // Try to compile the schema with AJV (like Monaco does)
    const ajv = new Ajv({ strict: false, validateFormats: false });

    let schemaIsValid = false;

    try {
      ajv.compile(jsonSchema);
      schemaIsValid = true;
      // console.log('✅ JSON Schema compiled successfully - Monaco autocomplete should work');
    } catch (error) {
      // console.log('❌ JSON Schema compilation failed:', error.message);

      // Common issues in generated schemas:
      if (error.message.includes('duplicate items')) {
        // console.log('Issue: Duplicate enum values in the schema');
      }
      if (error.message.includes('must be array')) {
        // console.log('Issue: Schema structure problems with array definitions');
      }
      if (error.message.includes('must match a schema in anyOf')) {
        // console.log('Issue: anyOf schema validation problems');
      }
    }

    // The schema must be valid for Monaco to work properly
    expect(schemaIsValid).toBe(true);

    if (!schemaIsValid) {
      // console.log('🔧 Schema generation produced invalid JSON Schema');
      // console.log('This breaks Monaco autocomplete and validation');
      // console.log('Error:', error.message);
    }
  });

  it('should generate a valid JSON Schema from a zod schema', () => {
    const workflowSchema = generateYamlSchemaFromConnectors(GENERATED_ELASTICSEARCH_CONNECTORS);
    const jsonSchema = getWorkflowJsonSchema(workflowSchema);

    // Test data with addCaseCommentDefaultSpace (proper workflow structure)
    const testWorkflow = {
      version: '1',
      name: 'Test Workflow',
      triggers: [{ type: 'manual' }], // Add a trigger to satisfy schema
      steps: [
        {
          name: 'test',
          type: 'elasticsearch.search',
          with: {
            index: 'test-index',
            query: {
              match: {
                message: 'test',
              },
            },
            size: 10,
          },
        },
      ],
    };

    // Test data with INVALID properties that should be rejected
    const invalidWorkflow = {
      version: '1',
      name: 'Test Workflow',
      triggers: [{ type: 'manual' }], // Add a trigger to satisfy schema
      steps: [
        {
          name: 'test',
          type: 'elasticsearch.search',
          with: {
            invalidProperty: 'this should be rejected',
            anotherBadProp: 'also bad',
          },
        },
      ],
    };

    const ajv = new Ajv({ strict: false, validateFormats: false });

    const validate = ajv.compile(jsonSchema as JSONSchema.JSONSchema);

    // Test 1: Valid data should pass
    const validResult = validate(testWorkflow);
    expect(validate.errors).toBe(null);
    expect(validResult).toBe(true);
    // console.log('Valid workflow validation result:', validResult);

    // Test 2: Invalid data should fail
    const invalidResult = validate(invalidWorkflow);
    expect(validate.errors).toBeDefined();
    expect(invalidResult).toBe(false); // console.log('Invalid workflow validation result:', invalidResult);

    // Check if validation is working properly
    // console.log('Valid result:', validResult, 'Invalid result:', invalidResult);

    // Check schema size to see if it's the useless fallback
    const roughSchemaSize = JSON.stringify(jsonSchema).length / 1024;
    // console.log(`Schema size: ${Math.round(schemaSize / 1024)}KB`);

    // Schema size should be between 5MB and 10MB
    expect(roughSchemaSize).toBeGreaterThan(5000);
    expect(roughSchemaSize).toBeLessThan(10000);
  });
});
