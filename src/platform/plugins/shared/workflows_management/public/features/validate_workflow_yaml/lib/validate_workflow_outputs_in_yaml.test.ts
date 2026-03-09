/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { validateWorkflowOutputsInYaml } from './validate_workflow_outputs_in_yaml';
import { parseWorkflowYamlForAutocomplete } from '../../../../common/lib/yaml';
import { createFakeMonacoModel } from '../../../../common/mocks/monaco_model';

describe('validateWorkflowOutputsInYaml', () => {
  const buildTestContext = (yamlString: string) => {
    const yamlDocument = YAML.parseDocument(yamlString, { keepSourceTokens: true });
    const model = createFakeMonacoModel(yamlString) as any;
    return { yamlDocument, model };
  };

  describe('JSON Schema format outputs', () => {
    it('should detect missing required field and wrong type for workflow.output (exact user YAML)', () => {
      const yamlString = `name: New workflow
enabled: true
description: This is a new workflow
triggers:
  - type: alert

inputs:
  - name: message
    type: string
    default: "hello world"

outputs:
  required:
    - b
  properties:
    a:
      type: string
      default: "aaaa"
    b:
      type: number

steps:
  - name: hello_world_step
    type: console
    with:
      message: "{{ event.alerts[0] | json: 2 }}"

  - name: return
    type: workflow.output
    with:
      a: {}`;

      const { yamlDocument, model } = buildTestContext(yamlString);

      const parseResult = parseWorkflowYamlForAutocomplete(yamlString);
      expect(parseResult.success).toBe(true);

      const workflowOutputs = parseResult.success
        ? (parseResult.data.outputs as JsonModelSchemaType)
        : undefined;
      expect(workflowOutputs).toBeDefined();
      expect(workflowOutputs?.required).toEqual(['b']);

      const results = validateWorkflowOutputsInYaml(yamlDocument, model, workflowOutputs);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.severity === 'error')).toBe(true);
    });

    it('should detect missing required field when only optional field provided', () => {
      const yamlString = `name: test
outputs:
  required:
    - b
  properties:
    a:
      type: string
    b:
      type: number
steps:
  - name: return
    type: workflow.output
    with:
      a: hello`;

      const { yamlDocument, model } = buildTestContext(yamlString);
      const parseResult = parseWorkflowYamlForAutocomplete(yamlString);
      const workflowOutputs = parseResult.success
        ? (parseResult.data.outputs as JsonModelSchemaType)
        : undefined;

      const results = validateWorkflowOutputsInYaml(yamlDocument, model, workflowOutputs);

      expect(results.length).toBeGreaterThanOrEqual(1);
      const errorMessages = results.map((r) => r.message);
      expect(errorMessages.some((m) => m?.includes('b'))).toBe(true);
    });

    it('should pass when all required fields are provided with correct types', () => {
      const yamlString = `name: test
outputs:
  required:
    - b
  properties:
    a:
      type: string
    b:
      type: number
steps:
  - name: return
    type: workflow.output
    with:
      a: hello
      b: 42`;

      const { yamlDocument, model } = buildTestContext(yamlString);
      const parseResult = parseWorkflowYamlForAutocomplete(yamlString);
      const workflowOutputs = parseResult.success
        ? (parseResult.data.outputs as JsonModelSchemaType)
        : undefined;

      const results = validateWorkflowOutputsInYaml(yamlDocument, model, workflowOutputs);

      expect(results).toHaveLength(0);
    });

    it('should validate using outputs from YAML document when workflowOutputs is undefined (fallback)', () => {
      const yamlString = `name: test
outputs:
  required:
    - b
  properties:
    a:
      type: string
    b:
      type: number
steps:
  - name: return
    type: workflow.output
    with:
      a: {}`;

      const { yamlDocument, model } = buildTestContext(yamlString);
      const results = validateWorkflowOutputsInYaml(yamlDocument, model, undefined);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.severity === 'error')).toBe(true);
    });
  });
});
