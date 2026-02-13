/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { validateWorkflowForExecution } from './validate_workflow_for_execution';

const createMockWorkflow = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto => ({
  id: 'test-workflow-id',
  name: 'Test Workflow',
  description: 'A test workflow',
  enabled: true,
  createdAt: '2026-01-01T00:00:00Z',
  createdBy: 'user1',
  lastUpdatedAt: '2026-01-01T00:00:00Z',
  lastUpdatedBy: 'user1',
  definition: {
    triggers: [],
    steps: [],
  } as unknown as WorkflowDetailDto['definition'],
  yaml: 'triggers: []\nsteps: []',
  valid: true,
  ...overrides,
});

describe('validateWorkflowForExecution', () => {
  it('should not throw for a valid, enabled workflow', () => {
    const workflow = createMockWorkflow();

    expect(() => validateWorkflowForExecution(workflow, 'test-workflow-id')).not.toThrow();
  });

  it('should throw when workflow is null (not found)', () => {
    expect(() => validateWorkflowForExecution(null, 'missing-id')).toThrow(
      'Workflow not found: missing-id'
    );
  });

  it('should throw when workflow definition is missing', () => {
    const workflow = createMockWorkflow({ definition: null });

    expect(() => validateWorkflowForExecution(workflow, 'test-workflow-id')).toThrow(
      'Workflow definition not found: test-workflow-id'
    );
  });

  it('should throw when workflow is not valid', () => {
    const workflow = createMockWorkflow({ valid: false });

    expect(() => validateWorkflowForExecution(workflow, 'test-workflow-id')).toThrow(
      'Workflow is not valid: test-workflow-id'
    );
  });

  it('should throw when workflow is disabled', () => {
    const workflow = createMockWorkflow({ enabled: false });

    expect(() => validateWorkflowForExecution(workflow, 'test-workflow-id')).toThrow(
      'Workflow is disabled: test-workflow-id. Enable the workflow to run it.'
    );
  });

  it('should check conditions in order: not found > no definition > not valid > disabled', () => {
    // A null workflow should throw "not found", not any other error
    expect(() => validateWorkflowForExecution(null, 'wf-1')).toThrow('Workflow not found: wf-1');

    // A workflow with no definition should throw "definition not found" even if also invalid and disabled
    const noDefAndInvalidAndDisabled = createMockWorkflow({
      definition: null,
      valid: false,
      enabled: false,
    });
    expect(() => validateWorkflowForExecution(noDefAndInvalidAndDisabled, 'wf-2')).toThrow(
      'Workflow definition not found: wf-2'
    );

    // An invalid workflow should throw "not valid" even if also disabled
    const invalidAndDisabled = createMockWorkflow({ valid: false, enabled: false });
    expect(() => validateWorkflowForExecution(invalidAndDisabled, 'wf-3')).toThrow(
      'Workflow is not valid: wf-3'
    );

    // A disabled but otherwise valid workflow should throw "disabled"
    const disabledOnly = createMockWorkflow({ enabled: false });
    expect(() => validateWorkflowForExecution(disabledOnly, 'wf-4')).toThrow(
      'Workflow is disabled: wf-4. Enable the workflow to run it.'
    );
  });
});
