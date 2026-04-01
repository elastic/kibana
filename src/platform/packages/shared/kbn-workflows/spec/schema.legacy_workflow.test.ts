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
import { JsonModelSchema } from './schema/common/json_model_schema';
import { isManualTrigger } from './schema/triggers/manual_trigger_schema';

describe('Legacy workflow format (backward compatibility)', () => {
  it('should accept legacy array format inputs with array type and defaults', () => {
    const workflow = {
      name: 'New workflow',
      enabled: false,
      description: 'This is a new workflow',
      tags: ['workflow', 'example'],
      triggers: [
        {
          type: 'manual',
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
    const manualTrigger = result.data?.triggers?.find((trigger) => isManualTrigger(trigger));

    if (!manualTrigger) {
      fail('Manual trigger should be defined');
    }

    const jsonSchemaInputs = JsonModelSchema.parse(manualTrigger?.inputs);

    expect(manualTrigger).toBeDefined();

    if (result.success) {
      // After transformation, inputs should be in JSON Schema format
      expect(jsonSchemaInputs).toBeDefined();
      expect(jsonSchemaInputs?.properties).toBeDefined();
      expect(jsonSchemaInputs?.properties?.people).toBeDefined();
      expect(jsonSchemaInputs?.properties?.greeting).toBeDefined();
      expect(jsonSchemaInputs?.properties?.people?.type).toBe('array');
      expect(jsonSchemaInputs?.properties?.people?.default).toEqual(['alice', 'bob', 'charlie']);
      expect(jsonSchemaInputs?.properties?.greeting?.type).toBe('string');
      expect(jsonSchemaInputs?.properties?.greeting?.default).toBe('Hello');
    }

    // Test WorkflowSchemaForAutocomplete (lenient validation for Monaco)
    const autocompleteResult = WorkflowSchemaForAutocomplete.safeParse(workflow);
    expect(autocompleteResult.success).toBe(true);

    const manualTriggerAutocomplete = autocompleteResult.data?.triggers?.find((trigger) =>
      isManualTrigger(trigger)
    );

    if (!manualTriggerAutocomplete) {
      fail('Manual trigger should be defined');
    }

    if (autocompleteResult.success) {
      // For autocomplete, inputs can remain as array format
      expect(manualTriggerAutocomplete.inputs).toBeDefined();
      // It can be either array or object format
      expect(
        Array.isArray(manualTriggerAutocomplete.inputs) ||
          (typeof manualTriggerAutocomplete.inputs === 'object' &&
            'properties' in manualTriggerAutocomplete.inputs)
      ).toBe(true);
    }
  });

  it('should accept legacy array format in WorkflowSchema and transform to JSON Schema', () => {
    const workflow = {
      name: 'Legacy workflow',
      enabled: true,
      triggers: [
        {
          type: 'manual',
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
        },
      ],
      steps: [{ name: 'step1', type: 'console', with: { message: 'test' } }],
    };

    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);

    const manualTrigger = result.data?.triggers?.find((trigger) => isManualTrigger(trigger));

    if (!manualTrigger) {
      fail('Manual trigger should be defined');
    }

    const jsonSchemaInputs = JsonModelSchema.parse(manualTrigger?.inputs);

    if (result.success) {
      // Should be transformed to JSON Schema format
      expect(jsonSchemaInputs).toBeDefined();
      expect(jsonSchemaInputs?.properties).toBeDefined();
      expect(jsonSchemaInputs?.properties?.username).toBeDefined();
      expect(jsonSchemaInputs?.properties?.age).toBeDefined();
      expect(jsonSchemaInputs?.required).toContain('username');
      expect(jsonSchemaInputs?.properties?.username?.default).toBe('admin');
      expect(jsonSchemaInputs?.properties?.age?.default).toBe(25);
    }
  });

  it('should parse and validate legacy security workflow YAML file', () => {
    const yamlPath = join(__dirname, 'examples', 'example_security_workflow_legacy.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const workflowData = parse(yamlContent);

    const result = WorkflowSchema.safeParse(workflowData);
    const manualTrigger = result.data?.triggers?.find((trigger) => isManualTrigger(trigger));

    if (!manualTrigger) {
      fail('Manual trigger should be defined');
    }

    const jsonSchemaInputs = JsonModelSchema.parse(manualTrigger?.inputs);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(jsonSchemaInputs?.properties).toBeDefined();
      expect(jsonSchemaInputs?.properties?.analystEmail).toBeDefined();
      expect(jsonSchemaInputs?.properties?.severity?.default).toBe('medium');
      expect(jsonSchemaInputs?.properties?.priority?.default).toBe('P2');
    }
  });
});
