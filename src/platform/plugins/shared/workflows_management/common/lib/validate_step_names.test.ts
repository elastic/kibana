/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { validateStepNameUniqueness } from './validate_step_names';

describe('validateStepNameUniqueness', () => {
  it('should return valid for workflow with unique step names', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        { name: 'step1', type: 'console' },
        { name: 'step2', type: 'http' },
        { name: 'step3', type: 'console' },
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return invalid for workflow with duplicate step names', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        { name: 'step1', type: 'console' },
        { name: 'step2', type: 'http' },
        { name: 'step1', type: 'console' },
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe('step1');
    expect(result.errors[0].occurrences).toBe(2);
    expect(result.errors[0].message).toBe(
      'Step name "step1" is not unique. Found 2 steps with this name.'
    );
  });

  it('should validate nested steps in foreach', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        { name: 'root_step', type: 'console' },
        {
          name: 'foreach_step',
          type: 'foreach',
          foreach: 'items',
          steps: [
            { name: 'nested_step', type: 'console' },
            { name: 'nested_step', type: 'http' },
          ],
        },
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe('nested_step');
    expect(result.errors[0].occurrences).toBe(2);
  });

  it('should validate nested steps in if/else', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'if_step',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'duplicate_name', type: 'console' }],
          else: [{ name: 'duplicate_name', type: 'http' }],
        },
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe('duplicate_name');
    expect(result.errors[0].occurrences).toBe(2);
  });

  it('should validate nested steps in parallel branches', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'parallel_step',
          type: 'parallel',
          branches: [
            {
              name: 'branch1',
              steps: [{ name: 'branch_step', type: 'console' }],
            },
            {
              name: 'branch2',
              steps: [{ name: 'branch_step', type: 'http' }],
            },
          ],
        },
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe('branch_step');
    expect(result.errors[0].occurrences).toBe(2);
  });

  it('should validate nested steps in atomic', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'atomic_step',
          type: 'atomic',
          steps: [
            { name: 'atomic_nested', type: 'console' },
            { name: 'atomic_nested', type: 'http' },
          ],
        } as any,
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe('atomic_nested');
    expect(result.errors[0].occurrences).toBe(2);
  });

  it('should validate nested steps in merge', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'merge_step',
          type: 'merge',
          steps: [
            { name: 'merge_nested', type: 'console' },
            { name: 'merge_nested', type: 'http' },
          ],
        } as any,
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe('merge_nested');
    expect(result.errors[0].occurrences).toBe(2);
  });

  it('should handle complex nested scenarios with multiple duplicates', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        { name: 'root_step', type: 'console' },
        {
          name: 'foreach_step',
          type: 'foreach',
          foreach: 'items',
          steps: [
            { name: 'root_step', type: 'console' },
            { name: 'inner_step', type: 'http' },
          ],
        },
        {
          name: 'if_step',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'inner_step', type: 'console' }],
          else: [{ name: 'root_step', type: 'http' }],
        },
      ],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);

    const rootStepError = result.errors.find((e) => e.stepName === 'root_step');
    const innerStepError = result.errors.find((e) => e.stepName === 'inner_step');

    expect(rootStepError).toBeDefined();
    expect(rootStepError?.occurrences).toBe(3);
    expect(innerStepError).toBeDefined();
    expect(innerStepError?.occurrences).toBe(2);
  });

  it('should handle workflow with no steps', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [],
    };

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle workflow with undefined steps', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
    } as WorkflowYaml;

    const result = validateStepNameUniqueness(workflow);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
