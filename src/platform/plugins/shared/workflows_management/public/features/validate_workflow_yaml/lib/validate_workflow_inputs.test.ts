/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { LineCounter } from 'yaml';
import YAML, { Scalar } from 'yaml';
import { validateWorkflowInputs } from './validate_workflow_inputs';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import type {
  StepInfo,
  StepPropInfo,
  WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { buildWorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

const mockLineCounter: LineCounter = {
  linePos: (offset: number) => ({ line: offset + 1, col: 1 }),
  lineStarts: [],
  addNewLine(offset: number): number {
    return offset + 1;
  },
};

function createScalar(value: unknown): Scalar<unknown> {
  const scalar = new Scalar(value);
  scalar.range = [0, 10, 10];
  return scalar;
}

function createPropInfo(
  path: string[],
  value: unknown,
  keyRange?: [number, number, number],
  valueRange?: [number, number, number]
): StepPropInfo {
  const keyNode = createScalar(path[path.length - 1]);
  const valueNode = createScalar(value);
  if (keyRange) {
    keyNode.range = keyRange;
  }
  if (valueRange) {
    valueNode.range = valueRange;
  }
  return { path, keyNode, valueNode };
}

function createWorkflowExecuteStep(
  stepId: string,
  workflowId: string,
  inputEntries: Record<string, unknown> = {},
  options: { stepType?: string; workflowIdRange?: [number, number, number] } = {}
): StepInfo {
  const { stepType = 'workflow.execute', workflowIdRange = [20, 30, 30] } = options;
  const propInfos: Record<string, StepPropInfo> = {
    name: createPropInfo(['name'], stepId),
    type: createPropInfo(['type'], stepType),
    'with.workflow-id': createPropInfo(
      ['with', 'workflow-id'],
      workflowId,
      undefined,
      workflowIdRange
    ),
  };

  let inputOffset = 40;
  for (const [key, value] of Object.entries(inputEntries)) {
    const keyRange: [number, number, number] = [
      inputOffset,
      inputOffset + key.length,
      inputOffset + key.length,
    ];
    propInfos[`with.inputs.${key}`] = createPropInfo(['with', 'inputs', key], value, keyRange);
    inputOffset += 20;
  }

  return {
    stepId,
    stepType,
    stepYamlNode: {} as any,
    lineStart: 1,
    lineEnd: 10,
    propInfos,
  };
}

function createWorkflowsResponse(
  entries: Array<{
    id: string;
    name: string;
    properties?: Record<string, JSONSchema7>;
    required?: string[];
  }>
): WorkflowsResponse {
  const workflows: WorkflowsResponse['workflows'] = {};
  for (const entry of entries) {
    workflows[entry.id] = {
      id: entry.id,
      name: entry.name,
      inputsSchema: entry.properties
        ? ({
            properties: entry.properties,
            required: entry.required ?? [],
          } as WorkflowsResponse['workflows'][string]['inputsSchema'])
        : undefined,
    };
  }
  return { workflows, totalWorkflows: entries.length };
}

describe('validateWorkflowInputs', () => {
  describe('when workflows response is null', () => {
    it('should return empty array', () => {
      const lookup: WorkflowLookup = { steps: {} };
      const results = validateWorkflowInputs(lookup, null, mockLineCounter);
      expect(results).toHaveLength(0);
    });
  });

  describe('when no workflow.execute steps exist', () => {
    it('should return empty array', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': {
            stepId: 'my-step',
            stepType: 'slack',
            stepYamlNode: {} as any,
            lineStart: 1,
            lineEnd: 5,
            propInfos: {},
          },
        },
      };
      const workflows = createWorkflowsResponse([]);
      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);
      expect(results).toHaveLength(0);
    });
  });

  describe('when workflow-id is a liquid template', () => {
    it('should skip validation', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', '${{ inputs.workflow_id }}', {
            unknown_key: 'value',
          }),
        },
      };
      const workflows = createWorkflowsResponse([
        { id: 'child-wf', name: 'Child Workflow', properties: { field1: { type: 'string' } } },
      ]);
      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);
      expect(results).toHaveLength(0);
    });
  });

  describe('when child workflow is not found', () => {
    it('should report error for invalid workflow-id', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'non-existent-wf', {
            field1: 'value',
          }),
        },
      };
      const workflows = createWorkflowsResponse([]);
      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
      expect(results[0].message).toContain('Workflow not found');
      expect(results[0].message).toContain('non-existent-wf');
      expect(results[0].owner).toBe('workflow-inputs-validation');
    });
  });

  describe('when child workflow has no inputsSchema', () => {
    it('should skip validation', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {
            field1: 'value',
          }),
        },
      };
      const workflows = createWorkflowsResponse([{ id: 'child-wf', name: 'Child' }]);
      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);
      expect(results).toHaveLength(0);
    });
  });

  describe('unknown input keys', () => {
    it('should report warning for unknown input keys', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {
            valid_field: 'value',
            unknown_field: 'value',
          }),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { valid_field: { type: 'string' } },
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        severity: 'warning',
        owner: 'workflow-inputs-validation',
      });
      expect(results[0].message).toContain('unknown_field');
      expect(results[0].message).toContain('Child Workflow');
      expect(results[0].message).toContain('valid_field');
    });

    it('should report multiple unknown keys', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {
            bad1: 'value1',
            bad2: 'value2',
          }),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { good_field: { type: 'string' } },
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.severity === 'warning')).toBe(true);
      expect(results[0].message).toContain('bad1');
      expect(results[1].message).toContain('bad2');
    });
  });

  describe('missing required inputs', () => {
    it('should report error for missing required inputs', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {}),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { required_field: { type: 'string' } },
          required: ['required_field'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        severity: 'error',
        owner: 'workflow-inputs-validation',
      });
      expect(results[0].message).toContain('required_field');
      expect(results[0].message).toContain('Child Workflow');
    });

    it('should not report error when required inputs are provided', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {
            required_field: 'value',
          }),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { required_field: { type: 'string' } },
          required: ['required_field'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(0);
    });

    it('should report multiple missing required fields', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {}),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: {
            field_a: { type: 'string' },
            field_b: { type: 'number' },
          },
          required: ['field_a', 'field_b'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.severity === 'error')).toBe(true);
      expect(results[0].message).toContain('field_a');
      expect(results[1].message).toContain('field_b');
    });
  });

  describe('combined unknown and missing required', () => {
    it('should report both unknown keys and missing required fields', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {
            wrong_field: 'value',
          }),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { required_field: { type: 'string' } },
          required: ['required_field'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(2);
      const unknownResult = results.find((r) => r.severity === 'warning');
      const missingResult = results.find((r) => r.severity === 'error');
      expect(unknownResult?.message).toContain('wrong_field');
      expect(missingResult?.message).toContain('required_field');
    });
  });

  describe('workflow.executeAsync steps', () => {
    it('should validate inputs for workflow.executeAsync steps', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep(
            'my-step',
            'child-wf',
            { unknown: 'val' },
            {
              stepType: 'workflow.executeAsync',
            }
          ),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { valid_field: { type: 'string' } },
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('warning');
      expect(results[0].message).toContain('unknown');
    });
  });

  describe('inputs as liquid template value', () => {
    it('should skip validation when inputs is a liquid template scalar', () => {
      const step = createWorkflowExecuteStep('my-step', 'child-wf', {});
      step.propInfos['with.inputs'] = createPropInfo(
        ['with', 'inputs'],
        '${{ steps.prepare.output }}'
      );

      const lookup: WorkflowLookup = { steps: { 'my-step': step } };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { required_field: { type: 'string' } },
          required: ['required_field'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(0);
    });
  });

  describe('multiple workflow.execute steps', () => {
    it('should validate all workflow.execute steps independently', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'step-1': createWorkflowExecuteStep('step-1', 'wf-a', { unknown: 'val' }),
          'step-2': createWorkflowExecuteStep('step-2', 'wf-b', {}),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'wf-a',
          name: 'Workflow A',
          properties: { valid: { type: 'string' } },
        },
        {
          id: 'wf-b',
          name: 'Workflow B',
          properties: { needed: { type: 'string' } },
          required: ['needed'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(2);
      const warningResult = results.find((r) => r.severity === 'warning');
      const errorResult = results.find((r) => r.severity === 'error');
      expect(warningResult?.message).toContain('unknown');
      expect(warningResult?.message).toContain('Workflow A');
      expect(errorResult?.message).toContain('needed');
      expect(errorResult?.message).toContain('Workflow B');
    });
  });

  describe('valid inputs', () => {
    it('should return empty array when all inputs are valid', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {
            name: 'test',
            count: 5,
          }),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: {
            name: { type: 'string' },
            count: { type: 'number' },
          },
          required: ['name'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(0);
    });

    it('should accept optional inputs that are not provided', () => {
      const lookup: WorkflowLookup = {
        steps: {
          'my-step': createWorkflowExecuteStep('my-step', 'child-wf', {
            required_field: 'value',
          }),
        },
      };
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: {
            required_field: { type: 'string' },
            optional_field: { type: 'string' },
          },
          required: ['required_field'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, mockLineCounter);

      expect(results).toHaveLength(0);
    });
  });

  describe('integration with real YAML parsing', () => {
    it('should detect unknown keys from parsed YAML', () => {
      const yaml = `
name: parent-workflow
version: "1"
steps:
  - name: call-child
    type: workflow.execute
    with:
      workflow-id: child-wf
      inputs:
        valid_field: hello
        unknown_field: world
`;
      const lineCounter = new YAML.LineCounter();
      const yamlDocument = YAML.parseDocument(yaml, { lineCounter });
      const lookup = buildWorkflowLookup(yamlDocument, lineCounter);

      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { valid_field: { type: 'string' } },
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, lineCounter);

      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('warning');
      expect(results[0].message).toContain('unknown_field');
      expect(results[0].owner).toBe('workflow-inputs-validation');
      expect(results[0].startLineNumber).toBeGreaterThan(0);
    });

    it('should detect missing required inputs from parsed YAML', () => {
      const yaml = `
name: parent-workflow
version: "1"
steps:
  - name: call-child
    type: workflow.execute
    with:
      workflow-id: child-wf
      inputs:
        optional_field: hello
`;
      const lineCounter = new YAML.LineCounter();
      const yamlDocument = YAML.parseDocument(yaml, { lineCounter });
      const lookup = buildWorkflowLookup(yamlDocument, lineCounter);

      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: {
            required_field: { type: 'string' },
            optional_field: { type: 'string' },
          },
          required: ['required_field'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, lineCounter);

      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
      expect(results[0].message).toContain('required_field');
      expect(results[0].owner).toBe('workflow-inputs-validation');
    });

    it('should return no errors for valid inputs from parsed YAML', () => {
      const yaml = `
name: parent-workflow
version: "1"
steps:
  - name: call-child
    type: workflow.execute
    with:
      workflow-id: child-wf
      inputs:
        name: test-name
        count: 5
`;
      const lineCounter = new YAML.LineCounter();
      const yamlDocument = YAML.parseDocument(yaml, { lineCounter });
      const lookup = buildWorkflowLookup(yamlDocument, lineCounter);

      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: {
            name: { type: 'string' },
            count: { type: 'number' },
          },
          required: ['name'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, lineCounter);

      expect(results).toHaveLength(0);
    });

    it('should handle workflow.execute step without inputs block', () => {
      const yaml = `
name: parent-workflow
version: "1"
steps:
  - name: call-child
    type: workflow.execute
    with:
      workflow-id: child-wf
`;
      const lineCounter = new YAML.LineCounter();
      const yamlDocument = YAML.parseDocument(yaml, { lineCounter });
      const lookup = buildWorkflowLookup(yamlDocument, lineCounter);

      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: { required_field: { type: 'string' } },
          required: ['required_field'],
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, lineCounter);

      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
      expect(results[0].message).toContain('required_field');
    });

    it('should report error when input value has wrong type (e.g. string for boolean)', () => {
      const yaml = `
name: parent-workflow
version: "1"
steps:
  - name: wf
    type: workflow.execute
    with:
      workflow-id: child-wf
      inputs:
        a: "A"
        b: "aaa"
        c: {}
`;
      const lineCounter = new YAML.LineCounter();
      const yamlDocument = YAML.parseDocument(yaml, { lineCounter });
      const lookup = buildWorkflowLookup(yamlDocument, lineCounter);

      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Idler',
          properties: {
            a: { type: 'string', default: 'A' },
            b: { type: 'boolean', default: false },
            c: { type: 'object' },
          },
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, lineCounter);

      const typeErrors = results.filter((r) => r.severity === 'error');
      expect(typeErrors.length).toBeGreaterThanOrEqual(1);
      const bError = typeErrors.find((r) => r.message?.includes('b'));
      expect(bError).toBeDefined();
      expect(bError!.message).toContain('Idler');
      expect(bError!.owner).toBe('workflow-inputs-validation');
    });

    it('should skip type validation gracefully when schema conversion throws', () => {
      const yaml = `
name: parent-workflow
version: "1"
steps:
  - name: call-child
    type: workflow.execute
    with:
      workflow-id: child-wf
      inputs:
        field_with_bad_schema: "some value"
`;
      const lineCounter = new YAML.LineCounter();
      const yamlDocument = YAML.parseDocument(yaml, { lineCounter });
      const lookup = buildWorkflowLookup(yamlDocument, lineCounter);

      // A schema with a $ref that can't be resolved will cause resolveRef to return null,
      // and an internally contradictory schema (e.g. allOf with conflicting types) could
      // cause convertJsonSchemaToZod to throw. We simulate this with a malformed schema
      // containing an unresolvable $ref.
      const workflows = createWorkflowsResponse([
        {
          id: 'child-wf',
          name: 'Child Workflow',
          properties: {
            field_with_bad_schema: { $ref: 'http://external/unresolvable' } as JSONSchema7,
          },
        },
      ]);

      const results = validateWorkflowInputs(lookup, workflows, lineCounter);

      // No type error should be reported — the catch block silently passes validation
      // so that an unconvertible schema doesn't block the user from editing.
      expect(results.filter((r) => r.severity === 'error')).toHaveLength(0);
    });
  });
});
