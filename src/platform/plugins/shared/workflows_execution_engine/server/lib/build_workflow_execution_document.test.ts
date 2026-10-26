/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus, WORKFLOW_RUN_NAME_MAX_LENGTH } from '@kbn/workflows';
import { buildWorkflowExecutionDocument } from './build_workflow_execution_document';
import {
  MISSING_EXECUTION_IDENTITY_ERROR_TYPE,
  MISSING_EXECUTION_IDENTITY_MESSAGE,
  UNKNOWN_EXECUTION_IDENTITY,
} from './execution_identity';
import { getWorkflowExecutionName } from './get_workflow_execution_name';
import type { WorkflowExecutionForInputRendering } from '../workflow_context_manager/build_workflow_context';

const baseWorkflow = {
  id: 'workflow-1',
  name: 'Test Workflow',
  enabled: true,
  definition: {
    name: 'Test Workflow',
    version: '1',
    enabled: true,
    triggers: [],
    steps: [],
  },
  yaml: 'name: Test Workflow',
  isTestRun: false,
} satisfies WorkflowExecutionEngineModel;

const logger = loggingSystemMock.createLogger();

const baseParams = {
  workflow: baseWorkflow,
  spaceId: 'default',
  context: { spaceId: 'default' },
  defaultTriggeredBy: 'manual',
  authenticatedUser: 'user-1',
  now: new Date('2024-06-01T12:00:00.000Z'),
  maxEventChainDepth: 10,
  getConcurrencyGroupKey: () => null,
  getRunName: (execution: WorkflowExecutionForInputRendering) =>
    getWorkflowExecutionName(execution, logger),
};

describe('buildWorkflowExecutionDocument', () => {
  describe('run-name', () => {
    const createExecution = (
      template: string | undefined,
      context: Record<string, unknown> = { inputs: { target: 'production' } }
    ) =>
      buildWorkflowExecutionDocument({
        ...baseParams,
        context,
        workflow: {
          ...baseWorkflow,
          definition: {
            ...baseWorkflow.definition,
            'run-name': template,
            consts: { prefix: 'Release' },
            triggers: [
              {
                type: 'manual',
                inputs: { properties: { target: { type: 'string', default: 'staging' } } },
              },
            ],
          },
        },
      });

    it('names the pending execution using its initial context', () => {
      const execution = createExecution(
        '  {{ consts.prefix }} {{ workflow.name }} to {{ inputs.target }} / {{ event.inputs.target }} by {{ execution.executedBy }}  '
      );

      expect(execution.status).toBe(ExecutionStatus.PENDING);
      expect(execution.runName).toBe('Release Test Workflow to production / production by user-1');
    });

    it('uses static input defaults before inputs are validated', () => {
      expect(createExecution('Deploy {{ inputs.target }}', {}).runName).toBe('Deploy staging');
    });

    it('uses the creation time before the execution starts', () => {
      expect(createExecution('{{ execution.startedAt | date: "%Y-%m-%d" }}').runName).toBe(
        '2024-06-01'
      );
    });

    it('renders event data for event-driven executions', () => {
      expect(
        createExecution('{{ event.title }}', { event: { type: 'alert', title: 'High CPU' } })
          .runName
      ).toBe('High CPU');
    });

    it.each([undefined, '', '  ', '{{ inputs.missing }}', '${{ inputs }}'])(
      'keeps the default label for %j',
      (template) => {
        const execution = createExecution(template);
        expect(execution.status).toBe(ExecutionStatus.PENDING);
        expect(execution.runName).toBeUndefined();
      }
    );

    it('logs a template failure and still creates the execution', () => {
      logger.warn.mockClear();
      const execution = createExecution('{{ inputs.target | invalid_filter }}');

      expect(execution.status).toBe(ExecutionStatus.PENDING);
      expect(execution.runName).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        'Could not evaluate run-name; using the default execution label.'
      );
    });

    it('bounds names produced by runtime data', () => {
      expect(
        createExecution('{{ inputs.target }}', {
          inputs: { target: 'x'.repeat(WORKFLOW_RUN_NAME_MAX_LENGTH + 1) },
        }).runName
      ).toBe('x'.repeat(WORKFLOW_RUN_NAME_MAX_LENGTH));
    });
  });

  it.each([undefined, 'child-account'])(
    'persists inherited identity instead of child identity (%s), without modifying its definition',
    (childAccount) => {
      const inheritedIdentity = {
        type: 'service_account' as const,
        id: 'parent-account',
        inheritedFrom: {
          workloadId: 'parent',
        },
      };
      const workflow = {
        ...baseWorkflow,
        definition: {
          name: 'Child',
          version: '1' as const,
          enabled: true,
          triggers: [],
          steps: [],
          settings: childAccount ? { run_as: childAccount } : undefined,
        },
      };
      const execution = buildWorkflowExecutionDocument({
        ...baseParams,
        workflow,
        inheritedIdentity,
        context: { parentWorkflowId: 'parent', parentWorkflowExecutionId: 'parent-run' },
      });
      expect(execution.effectiveIdentity).toEqual(inheritedIdentity);
      expect(execution.context).toMatchObject({
        parentWorkflowId: 'parent',
        parentWorkflowExecutionId: 'parent-run',
      });
      expect(execution.executedBy).toBe('user-1');
      expect(execution.workflowDefinition?.settings?.run_as).toBe(childAccount);
      expect(execution.yaml).toBe(baseWorkflow.yaml);
    }
  );

  it('uses the explicit execution space instead of the context or global workflow storage space', () => {
    const context = { spaceId: 'foreign-space', inputs: { message: 'test input' } };
    const getConcurrencyGroupKey = jest.fn(() => null);
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      workflow: { ...baseWorkflow, spaceId: '*' },
      spaceId: 'request-space',
      context,
      getConcurrencyGroupKey,
    });

    expect(workflowExecution).toMatchObject({
      spaceId: 'request-space',
      context: { spaceId: 'request-space', inputs: { message: 'test input' } },
    });
    expect(getConcurrencyGroupKey).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'request-space',
        context: expect.objectContaining({ spaceId: 'request-space' }),
      })
    );
    expect(context.spaceId).toBe('foreign-space');
  });

  it('uses the explicit space when the context does not contain a space', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      spaceId: 'request-space',
      context: { inputs: { message: 'test input' } },
    });

    expect(workflowExecution).toMatchObject({
      spaceId: 'request-space',
      context: { spaceId: 'request-space', inputs: { message: 'test input' } },
    });
  });

  it('preserves saved-child classification during a test run', () => {
    expect(
      buildWorkflowExecutionDocument({
        ...baseParams,
        workflow: { ...baseWorkflow, isTestRun: true, isEphemeral: false },
      })
    ).toMatchObject({ isTestRun: true, isEphemeral: false });
  });

  it('sets version when workflow has version', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      workflow: { ...baseWorkflow, version: 3 },
    });

    expect(workflowExecution.version).toBe(3);
  });

  it('omits version when workflow has no version', () => {
    const workflowExecution = buildWorkflowExecutionDocument(baseParams);

    expect(workflowExecution.version).toBeUndefined();
  });

  it('omits version when workflow has an invalid numeric version', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      workflow: { ...baseWorkflow, version: Number.NaN },
    });

    expect(workflowExecution.version).toBeUndefined();
  });

  it('builds core execution fields', () => {
    const workflowExecution = buildWorkflowExecutionDocument(baseParams);

    expect(workflowExecution).toMatchObject({
      spaceId: 'default',
      workflowId: 'workflow-1',
      status: ExecutionStatus.PENDING,
      executedBy: 'user-1',
      triggeredBy: 'manual',
      createdAt: '2024-06-01T12:00:00.000Z',
    });
    expect(workflowExecution.id).toBeDefined();
  });

  it('fails the execution immediately when no identity is attached', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      authenticatedUser: undefined,
    });

    expect(workflowExecution).toMatchObject({
      status: ExecutionStatus.FAILED,
      executedBy: UNKNOWN_EXECUTION_IDENTITY,
      finishedAt: '2024-06-01T12:00:00.000Z',
      error: {
        type: MISSING_EXECUTION_IDENTITY_ERROR_TYPE,
        message: MISSING_EXECUTION_IDENTITY_MESSAGE,
      },
    });
  });

  it('does not treat a real principal named unknown as a missing identity', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      authenticatedUser: 'unknown',
    });

    expect(workflowExecution).toMatchObject({
      status: ExecutionStatus.PENDING,
      executedBy: 'unknown',
    });
    expect(workflowExecution.error).toBeUndefined();
    expect(workflowExecution.finishedAt).toBeUndefined();
  });

  it('copies managed workflow billable metadata', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      workflow: {
        ...baseWorkflow,
        managed: true,
        billable: true,
      },
    });

    expect(workflowExecution).toMatchObject({
      managed: true,
      billable: true,
    });
  });
});
