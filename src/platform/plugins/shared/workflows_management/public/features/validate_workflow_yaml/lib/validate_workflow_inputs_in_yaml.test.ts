/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter } from 'yaml';
import type { WorkflowInput } from '@kbn/workflows';
import { validateWorkflowInputsInYaml } from './validate_workflow_inputs_in_yaml';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import type { WorkflowInputsItem } from '../model/types';

describe('validateWorkflowInputsInYaml', () => {
  const createWorkflowInputsItem = (
    overrides: Partial<WorkflowInputsItem> = {}
  ): WorkflowInputsItem => ({
    id: 'test-inputs-1',
    workflowId: 'workflow-123',
    inputs: { name: 'test' },
    inputsNode: null,
    startLineNumber: 5,
    startColumn: 10,
    endLineNumber: 7,
    endColumn: 20,
    yamlPath: ['steps', 0, 'with', 'inputs'],
    ...overrides,
  });

  const createWorkflowsResponse = (
    workflows: Record<string, { inputs?: WorkflowInput[] }> = {}
  ): WorkflowsResponse => ({
    workflows: Object.entries(workflows).reduce((acc, [id, data]) => {
      acc[id] = {
        id,
        name: `Workflow ${id}`,
        inputs: data.inputs,
      };
      return acc;
    }, {} as WorkflowsResponse['workflows']),
    totalWorkflows: Object.keys(workflows).length,
  });

  describe('when workflow is not found', () => {
    it('should return empty array when workflowId does not exist in workflows', () => {
      const items: WorkflowInputsItem[] = [createWorkflowInputsItem({ workflowId: 'unknown' })];
      const workflows = createWorkflowsResponse({});

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(0);
    });
  });

  describe('when workflow has no inputs defined', () => {
    it('should return empty array when target workflow has no inputs or inputs are undefined', () => {
      const items: WorkflowInputsItem[] = [createWorkflowInputsItem()];
      const workflows1 = createWorkflowsResponse({
        'workflow-123': { inputs: [] },
      });
      const workflows2 = createWorkflowsResponse({
        'workflow-123': {},
      });

      expect(validateWorkflowInputsInYaml(items, workflows1, new LineCounter())).toHaveLength(0);
      expect(validateWorkflowInputsInYaml(items, workflows2, new LineCounter())).toHaveLength(0);
    });
  });

  describe('when inputs are valid', () => {
    it('should return empty array for valid inputs', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      const items: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          inputs: { name: 'test' },
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-123': { inputs: targetInputs },
      });

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(0);
    });
  });

  describe('when inputs are invalid', () => {
    it('should return error for wrong input type', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      const items: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          inputs: { name: 123 },
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-123': { inputs: targetInputs },
      });

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('error');
      expect(result[0].message).toContain('name:');
      expect(result[0].message).toContain('string');
      expect(result[0].owner).toBe('workflow-inputs-validation');
    });

    it('should return error for missing required input', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      const items: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          inputs: {},
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-123': { inputs: targetInputs },
      });

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('error');
      expect(result[0].message).toContain('name:');
      expect(result[0].message).toContain('this field is required');
      expect(result[0].owner).toBe('workflow-inputs-validation');
    });

    it('should return multiple errors for multiple invalid inputs', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
        {
          name: 'count',
          type: 'number',
          required: true,
        },
      ];

      const items: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          inputs: { name: 123, count: '42' },
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-123': { inputs: targetInputs },
      });

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(2);
      expect(result[0].severity).toBe('error');
      expect(result[1].severity).toBe('error');
      expect(result[0].message).toContain('name:');
      expect(result[1].message).toContain('count:');
    });

    it('should return error for array type mismatch', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'people',
          type: 'array',
          required: true,
        },
      ];

      const items: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          inputs: { people: 'charlie' },
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-123': { inputs: targetInputs },
      });

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('people:');
      expect(result[0].message).toContain('expected array, received string');
    });
  });

  describe('when validating multiple workflow inputs items', () => {
    it('should validate each item independently', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      const items: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          id: 'item-1',
          workflowId: 'workflow-1',
          inputs: { name: 'valid' },
        }),
        createWorkflowInputsItem({
          id: 'item-2',
          workflowId: 'workflow-2',
          inputs: { name: 123 },
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-1': { inputs: targetInputs },
        'workflow-2': { inputs: targetInputs },
      });

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(1);
      expect(result[0].id).toContain('item-2');
    });
  });

  describe('error positioning and formatting', () => {
    it('should use item range when specific field range cannot be found and format error messages correctly', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      const items1: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          inputs: { name: 123 },
          inputsNode: null, // No inputsNode means we'll use fallback range
        }),
      ];
      const items2: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          inputs: {},
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-123': { inputs: targetInputs },
      });

      const result1 = validateWorkflowInputsInYaml(items1, workflows, new LineCounter());
      expect(result1).toHaveLength(1);
      expect(result1[0].startLineNumber).toBe(5);
      expect(result1[0].message).toMatch(/^name:/);

      const result2 = validateWorkflowInputsInYaml(items2, workflows, new LineCounter());
      expect(result2).toHaveLength(1);
      expect(result2[0].message).toMatch(/^name:/);
      expect(result2[0].message).toContain('this field is required');
    });
  });

  describe('when workflowId is null', () => {
    it('should skip validation for items with null workflowId', () => {
      const items: WorkflowInputsItem[] = [
        createWorkflowInputsItem({
          workflowId: null,
        }),
      ];

      const workflows = createWorkflowsResponse({
        'workflow-123': {
          inputs: [
            {
              name: 'name',
              type: 'string',
              required: true,
            },
          ],
        },
      });

      const result = validateWorkflowInputsInYaml(items, workflows, new LineCounter());
      expect(result).toHaveLength(0);
    });
  });
});
