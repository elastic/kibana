/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import type {
  EsWorkflow,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowYaml,
} from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '../../server/types';
import { WorkflowRepositoryMock } from '../mocks/workflow_repository.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

// Mock the workflow repository module
jest.mock('@kbn/workflows', () => {
  const actual = jest.requireActual('@kbn/workflows');
  return {
    ...actual,
    WorkflowRepository: jest.fn(),
  };
});

// Mock the workflow repository in setup_dependencies
jest.mock('../../server/execution_functions/setup_dependencies', () => {
  const actual = jest.requireActual('../../server/execution_functions/setup_dependencies');
  return {
    ...actual,
    setupDependencies: jest.fn(actual.setupDependencies),
  };
});

describe('workflow.execute step', () => {
  let workflowRunFixture: WorkflowRunFixture;
  let workflowRepositoryMock: WorkflowRepositoryMock;
  let workflowsExecutionEngineMock: WorkflowsExecutionEnginePluginStart;
  let childWorkflowExecutionId: string;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
    workflowRepositoryMock = new WorkflowRepositoryMock();
    childWorkflowExecutionId = generateUuid();

    // Mock workflowsExecutionEngine
    workflowsExecutionEngineMock = {
      executeWorkflow: jest.fn().mockResolvedValue({
        workflowExecutionId: childWorkflowExecutionId,
      }),
      executeWorkflowStep: jest.fn(),
      cancelWorkflowExecution: jest.fn(),
      scheduleWorkflow: jest.fn(),
      workflowEventLoggerService: {} as any,
    };

    // Add mocks to dependencies
    (workflowRunFixture.dependencies as any).workflowRepository = workflowRepositoryMock;
    (workflowRunFixture.dependencies as any).workflowsExecutionEngine =
      workflowsExecutionEngineMock;
    (workflowRunFixture.dependencies as any).spaceId = 'fake_space_id';
    (workflowRunFixture.dependencies as any).request = workflowRunFixture.fakeKibanaRequest;

    // Mock WorkflowRepository constructor
    const workflowRepoModule = jest.requireMock('@kbn/workflows');
    (workflowRepoModule.WorkflowRepository as jest.Mock).mockImplementation(
      () => workflowRepositoryMock
    );

    // Setup jest spies for repository methods
    jest
      .spyOn(workflowRepositoryMock, 'getWorkflow')
      .mockImplementation(workflowRepositoryMock.getWorkflow.bind(workflowRepositoryMock));
    jest
      .spyOn(workflowRepositoryMock, 'findWorkflowByName')
      .mockImplementation(workflowRepositoryMock.findWorkflowByName.bind(workflowRepositoryMock));
  });

  describe('async mode (await: false)', () => {
    beforeEach(async () => {
      // Create a child workflow
      const childWorkflow: EsWorkflow = {
        id: 'child-workflow-id',
        name: 'child-workflow',
        description: 'Child workflow',
        enabled: true,
        tags: [],
        valid: true,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        definition: {
          version: '1',
          name: 'child-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [
            {
              name: 'childStep',
              type: 'slack',
              'connector-id': 'slack-connector',
              with: {
                message: 'Hello from child',
              },
            },
          ],
        },
        yaml: '',
        deleted_at: null,
      };
      workflowRepositoryMock.workflows.set('child-workflow-id', childWorkflow);

      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      inputs:
        param1: "value1"
        param2: "value2"
      await: false

  - name: finalStep
    type: slack
    connector-id: slack-connector
    with:
      message: 'Parent workflow continues'
`,
      });
    });

    it('should successfully complete parent workflow', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should execute child workflow without waiting', async () => {
      expect(workflowsExecutionEngineMock.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'child-workflow-id',
        }),
        expect.objectContaining({
          spaceId: 'fake_space_id',
          inputs: {
            param1: 'value1',
            param2: 'value2',
          },
          triggeredBy: 'workflow-step',
          parentWorkflowId: 'fake_foreach_id',
          parentWorkflowExecutionId: 'fake_workflow_execution_id',
        }),
        expect.anything()
      );
    });

    it('should return execution ID immediately', async () => {
      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions.length).toBe(1);
      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(executeStepExecutions[0].output).toEqual({
        workflowId: 'child-workflow-id',
        executionId: childWorkflowExecutionId,
        awaited: false,
        status: 'pending',
      });
    });

    it('should continue to next step without waiting', async () => {
      const finalStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');

      expect(finalStepExecutions.length).toBe(1);
      expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('sync mode (await: true)', () => {
    let childExecution: EsWorkflowExecution;

    beforeEach(async () => {
      // Create a child workflow
      const childWorkflow: EsWorkflow = {
        id: 'child-workflow-id',
        name: 'child-workflow',
        description: 'Child workflow',
        enabled: true,
        tags: [],
        valid: true,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        definition: {
          version: '1',
          name: 'child-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [
            {
              name: 'childStep',
              type: 'slack',
              'connector-id': 'slack-connector',
              with: {
                message: 'Hello from child',
              },
            },
          ],
        },
        yaml: '',
        deleted_at: null,
      };
      workflowRepositoryMock.workflows.set('child-workflow-id', childWorkflow);

      // Create child execution that will be polled
      childExecution = {
        id: childWorkflowExecutionId,
        spaceId: 'fake_space_id',
        workflowId: 'child-workflow-id',
        isTestRun: false,
        status: ExecutionStatus.RUNNING,
        context: {
          inputs: {},
          parentWorkflowId: 'fake_foreach_id',
          parentWorkflowExecutionId: 'fake_workflow_execution_id',
          parentStepId: 'executeChild',
        },
        workflowDefinition: childWorkflow.definition as WorkflowYaml,
        yaml: '',
        scopeStack: [],
        createdAt: new Date().toISOString(),
        error: null,
        createdBy: 'system',
        startedAt: new Date().toISOString(),
        finishedAt: '',
        cancelRequested: false,
        duration: 0,
        triggeredBy: 'workflow-step',
      };
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.set(
        childWorkflowExecutionId,
        childExecution
      );

      // Create child step execution for output extraction
      const childStepExecution: EsWorkflowStepExecution = {
        id: generateUuid(),
        spaceId: 'fake_space_id',
        stepId: 'childStep',
        stepType: 'slack',
        scopeStack: [],
        workflowRunId: childWorkflowExecutionId,
        workflowId: 'child-workflow-id',
        status: ExecutionStatus.COMPLETED,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        executionTimeMs: 100,
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        output: {
          result: 'success',
          data: { message: 'Hello from child' },
        },
      };
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.set(
        childStepExecution.id,
        childStepExecution
      );
    });

    it('should enter wait state on first execution', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      inputs:
        param1: "value1"
      await: true
`,
      });

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions.length).toBe(1);
      // Step should be in WAITING state (not completed yet)
      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.WAITING);
      expect(executeStepExecutions[0].state).toEqual({
        workflowId: 'child-workflow-id',
        executionId: childWorkflowExecutionId,
        startedAt: expect.any(String),
      });
    });

    it('should complete when child workflow finishes', async () => {
      // First run - enters wait state
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      await: true
`,
      });

      // Update child execution to completed
      childExecution.status = ExecutionStatus.COMPLETED;
      childExecution.finishedAt = new Date().toISOString();
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.set(
        childWorkflowExecutionId,
        childExecution
      );

      // Resume workflow - should detect completion
      await workflowRunFixture.resumeWorkflow();

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions.length).toBe(1);
      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(executeStepExecutions[0].output).toEqual({
        workflowId: 'child-workflow-id',
        executionId: childWorkflowExecutionId,
        awaited: true,
        status: ExecutionStatus.COMPLETED,
        output: {
          result: 'success',
          data: { message: 'Hello from child' },
        },
        startedAt: expect.any(String),
        completedAt: expect.any(String),
      });
    });

    it('should continue polling if child workflow is still running', async () => {
      // First run - enters wait state
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      await: true
`,
      });

      // Resume - child still running
      await workflowRunFixture.resumeWorkflow();

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      // Should still be in WAITING state
      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.WAITING);
    });

    it('should fail step if child workflow fails', async () => {
      // First run - enters wait state
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      await: true
`,
      });

      // Update child execution to failed
      childExecution.status = ExecutionStatus.FAILED;
      childExecution.finishedAt = new Date().toISOString();
      childExecution.error = {
        type: 'Error',
        message: 'Child workflow failed',
      };
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.set(
        childWorkflowExecutionId,
        childExecution
      );

      // Resume workflow - should detect failure
      await workflowRunFixture.resumeWorkflow();

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
      expect(executeStepExecutions[0].error).toBeDefined();
    });
  });

  describe('workflow resolution', () => {
    beforeEach(async () => {
      const childWorkflow: EsWorkflow = {
        id: 'child-workflow-id',
        name: 'child-workflow-name',
        description: 'Child workflow',
        enabled: true,
        tags: [],
        valid: true,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        definition: {
          version: '1',
          name: 'child-workflow-name',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [],
        },
        yaml: '',
        deleted_at: null,
      };
      workflowRepositoryMock.workflows.set('child-workflow-id', childWorkflow);
    });

    it('should resolve workflow by ID', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      await: false
`,
      });

      expect(workflowRepositoryMock.getWorkflow).toHaveBeenCalledWith(
        'child-workflow-id',
        'fake_space_id'
      );
      expect(workflowsExecutionEngineMock.executeWorkflow).toHaveBeenCalled();
    });

    it('should resolve workflow by name', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        name: "child-workflow-name"
      await: false
`,
      });

      expect(workflowRepositoryMock.findWorkflowByName).toHaveBeenCalledWith(
        'child-workflow-name',
        'fake_space_id'
      );
      expect(workflowsExecutionEngineMock.executeWorkflow).toHaveBeenCalled();
    });

    it('should fail if workflow not found by ID', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "non-existent-id"
      await: false
`,
      });

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
      expect(executeStepExecutions[0].error?.message).toContain('Workflow not found');
    });

    it('should fail if workflow not found by name', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        name: "non-existent-name"
      await: false
`,
      });

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
      expect(executeStepExecutions[0].error?.message).toContain('Workflow not found');
    });
  });

  describe('workflow validation', () => {
    it('should fail if workflow is disabled', async () => {
      const disabledWorkflow: EsWorkflow = {
        id: 'disabled-workflow-id',
        name: 'disabled-workflow',
        description: 'Disabled workflow',
        enabled: false,
        tags: [],
        valid: true,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        definition: {
          version: '1',
          name: 'disabled-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [],
        },
        yaml: '',
        deleted_at: null,
      };
      workflowRepositoryMock.workflows.set('disabled-workflow-id', disabledWorkflow);

      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "disabled-workflow-id"
      await: false
`,
      });

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
      expect(executeStepExecutions[0].error?.message).toContain('disabled');
    });

    it('should fail if workflow is invalid', async () => {
      const invalidWorkflow: EsWorkflow = {
        id: 'invalid-workflow-id',
        name: 'invalid-workflow',
        description: 'Invalid workflow',
        enabled: true,
        tags: [],
        valid: false,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        definition: {
          version: '1',
          name: 'invalid-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [],
        },
        yaml: '',
        deleted_at: null,
      };
      workflowRepositoryMock.workflows.set('invalid-workflow-id', invalidWorkflow);

      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "invalid-workflow-id"
      await: false
`,
      });

      const executeStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'executeChild');

      expect(executeStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
      expect(executeStepExecutions[0].error?.message).toContain('not valid');
    });
  });

  describe('input mapping', () => {
    beforeEach(async () => {
      const childWorkflow: EsWorkflow = {
        id: 'child-workflow-id',
        name: 'child-workflow',
        description: 'Child workflow',
        enabled: true,
        tags: [],
        valid: true,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        definition: {
          version: '1',
          name: 'child-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [],
        },
        yaml: '',
        deleted_at: null,
      };
      workflowRepositoryMock.workflows.set('child-workflow-id', childWorkflow);
    });

    it('should map inputs with template resolution', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: setupStep
    type: slack
    connector-id: slack-connector
    with:
      message: 'Setup complete'

  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      inputs:
        param1: "{{steps.setupStep.output.result}}"
        param2: "static-value"
      await: false
`,
      });

      expect(workflowsExecutionEngineMock.executeWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          inputs: expect.objectContaining({
            param2: 'static-value',
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('parent context propagation', () => {
    beforeEach(async () => {
      const childWorkflow: EsWorkflow = {
        id: 'child-workflow-id',
        name: 'child-workflow',
        description: 'Child workflow',
        enabled: true,
        tags: [],
        valid: true,
        createdAt: new Date(),
        createdBy: 'system',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'system',
        definition: {
          version: '1',
          name: 'child-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [],
        },
        yaml: '',
        deleted_at: null,
      };
      workflowRepositoryMock.workflows.set('child-workflow-id', childWorkflow);
    });

    it('should propagate parent workflow information to child', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: executeChild
    type: workflow.execute
    with:
      workflow:
        id: "child-workflow-id"
      await: false
`,
      });

      expect(workflowsExecutionEngineMock.executeWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          parentWorkflowId: 'fake_foreach_id',
          parentWorkflowExecutionId: 'fake_workflow_execution_id',
          parentStepId: 'executeChild',
        }),
        expect.anything()
      );
    });
  });
});
