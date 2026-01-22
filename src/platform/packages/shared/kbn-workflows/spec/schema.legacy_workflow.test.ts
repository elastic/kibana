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
import { WorkflowSchema, WorkflowSchemaForAutocomplete } from './schema';

describe('Legacy workflow format (backward compatibility)', () => {
  it('should accept legacy array format inputs with array type and defaults', () => {
    const workflow = {
      name: 'New workflow',
      enabled: false,
      description: 'This is a new workflow',
      tags: ['workflow', 'example'],
      triggers: [{ type: 'manual' }],
      inputs: [
        {
          name: 'people',
          type: 'array',
          default: ['alice', 'bob', 'charlie'],
          description: 'List of people to greet',
        },
        {
          name: 'greeting',
          type: 'string',
          default: 'Hello',
          description: 'The greeting message to use',
        },
      ],
      consts: {
        favorite_person: 'bob',
        api_endpoint: 'https://api.example.com',
      },
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

    // Test WorkflowSchema (strict validation)
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
    if (result.success) {
      // After transformation, inputs should be in JSON Schema format
      expect(result.data.inputs).toBeDefined();
      expect(result.data.inputs?.properties).toBeDefined();
      expect(result.data.inputs?.properties?.people).toBeDefined();
      expect(result.data.inputs?.properties?.greeting).toBeDefined();
      expect(result.data.inputs?.properties?.people?.type).toBe('array');
      expect(result.data.inputs?.properties?.people?.default).toEqual(['alice', 'bob', 'charlie']);
      expect(result.data.inputs?.properties?.greeting?.type).toBe('string');
      expect(result.data.inputs?.properties?.greeting?.default).toBe('Hello');
    }

    // Test WorkflowSchemaForAutocomplete (lenient validation for Monaco)
    const autocompleteResult = WorkflowSchemaForAutocomplete.safeParse(workflow);
    expect(autocompleteResult.success).toBe(true);
    if (autocompleteResult.success) {
      // For autocomplete, inputs can remain as array format
      expect(autocompleteResult.data.inputs).toBeDefined();
      // It can be either array or object format
      expect(
        Array.isArray(autocompleteResult.data.inputs) ||
          (typeof autocompleteResult.data.inputs === 'object' &&
            'properties' in autocompleteResult.data.inputs)
      ).toBe(true);
    }
  });

  it('should accept legacy array format in WorkflowSchema and transform to JSON Schema', () => {
    const workflow = {
      name: 'Legacy workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      inputs: [
        {
          name: 'username',
          type: 'string',
          required: true,
          default: 'admin',
        },
        {
          name: 'age',
          type: 'number',
          default: 25,
        },
      ],
      steps: [{ name: 'step1', type: 'console', with: { message: 'test' } }],
    };

    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
    if (result.success) {
      // Should be transformed to JSON Schema format
      expect(result.data.inputs).toBeDefined();
      expect(result.data.inputs?.properties).toBeDefined();
      expect(result.data.inputs?.properties?.username).toBeDefined();
      expect(result.data.inputs?.properties?.age).toBeDefined();
      expect(result.data.inputs?.required).toContain('username');
      expect(result.data.inputs?.properties?.username?.default).toBe('admin');
      expect(result.data.inputs?.properties?.age?.default).toBe(25);
    }
  });

  it('should parse and validate legacy security workflow YAML file', () => {
    const yamlPath = join(__dirname, 'examples', 'example_security_workflow_legacy.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const workflowData = parse(yamlContent);

    const result = WorkflowSchema.safeParse(workflowData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputs?.properties).toBeDefined();
      expect(result.data.inputs?.properties?.analystEmail).toBeDefined();
      expect(result.data.inputs?.properties?.severity?.default).toBe('medium');
      expect(result.data.inputs?.properties?.priority?.default).toBe('P2');
    }
  });
});
