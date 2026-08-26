/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { buildWorkflowExecutionDocument } from './build_workflow_execution_document';

const baseWorkflow: WorkflowExecutionEngineModel = {
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
};

const baseParams = {
  workflow: baseWorkflow,
  context: { spaceId: 'default' },
  defaultTriggeredBy: 'manual',
  authenticatedUser: 'user-1',
  now: new Date('2024-06-01T12:00:00.000Z'),
  maxEventChainDepth: 10,
  getConcurrencyGroupKey: () => null,
};

describe('buildWorkflowExecutionDocument', () => {
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
      effectiveIdentity: 'user-1',
      triggeredBy: 'manual',
      createdAt: '2024-06-01T12:00:00.000Z',
    });
    expect(workflowExecution.id).toBeDefined();
  });

  it('persists the run_as service account as the effective identity', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      workflow: {
        ...baseWorkflow,
        definition: {
          name: 'Test Workflow',
          version: '1',
          enabled: true,
          triggers: [],
          steps: [],
          settings: { run_as: 'service-account-1' },
        },
      },
    });

    expect(workflowExecution.executedBy).toBe('user-1');
    expect(workflowExecution.effectiveIdentity).toBe('service-account-1');
  });

  it('uses the initiating user as effective identity for test runs', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      workflow: {
        ...baseWorkflow,
        isTestRun: true,
        definition: {
          name: 'Test Workflow',
          version: '1',
          enabled: true,
          triggers: [],
          steps: [],
          settings: { run_as: 'service-account-1' },
        },
      },
    });

    expect(workflowExecution.effectiveIdentity).toBe('user-1');
  });

  it('persists whether the workflow execution is ephemeral', () => {
    const workflowExecution = buildWorkflowExecutionDocument({
      ...baseParams,
      workflow: { ...baseWorkflow, isEphemeral: true },
    });

    expect(workflowExecution.isEphemeral).toBe(true);
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
