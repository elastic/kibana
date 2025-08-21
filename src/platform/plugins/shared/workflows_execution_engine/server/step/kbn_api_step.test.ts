/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnApiStepImpl } from './kbn_api_step';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import { graphlib } from '@dagrejs/dagre';

const createRuntime = () => {
  const g = new graphlib.Graph();
  g.setNode('s1', { id: 's1', type: 'atomic', configuration: {} });
  const workflowExecution = {
    id: 'run-1',
    workflowId: 'wf-1',
    status: 'running',
  } as any;
  const workflowExecutionRepository = {
    updateWorkflowExecution: jest.fn(),
  } as any;
  const stepExecutionRepository = {
    createStepExecution: jest.fn(),
    updateStepExecution: jest.fn(),
    updateStepExecutions: jest.fn(),
  } as any;
  const workflowLogger = { logInfo: jest.fn(), logDebug: jest.fn() } as any;

  const mgr = new WorkflowExecutionRuntimeManager({
    workflowExecution,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowExecutionGraph: g,
    workflowLogger,
  });

  // Assign fns to avoid type issues with spyOn signatures
  (mgr as any).startStep = jest.fn(async (_stepId: string) => {});
  (mgr as any).setStepResult = jest.fn(async (_stepId: string, _result: any) => {});
  (mgr as any).finishStep = jest.fn(async (_stepId: string) => {});
  (mgr as any).getCurrentStep = jest.fn().mockReturnValue({ id: 's1' });
  (mgr as any).getStepResult = jest.fn().mockReturnValue(undefined);
  (mgr as any).getStepState = jest.fn().mockReturnValue(undefined);

  return mgr;
};

const createContextManager = (runtime: WorkflowExecutionRuntimeManager) =>
  new WorkflowContextManager({
    workflowRunId: 'run-1',
    workflow: {
      version: '1',
      name: 'wf',
      enabled: true,
      triggers: [{ type: 'triggers.elastic.manual', enabled: true }],
      steps: [],
    } as any,
    event: { type: 'manual' },
    workflowExecutionGraph: (runtime as any).workflowExecutionGraph,
    workflowExecutionRuntime: runtime,
  });

describe('KbnApiStepImpl', () => {
  test('returns no-op when with.api is not provided', async () => {
    const runtime = createRuntime();
    const ctxMgr = createContextManager(runtime);
    const services = {} as any;

    const step = new KbnApiStepImpl(
      {
        type: 'kibana.request',
        name: 'kbn',
        request: { method: 'POST', path: '/api/cases' },
      } as any,
      services,
      ctxMgr,
      runtime
    );

    await step.run();

    expect((runtime as any).setStepResult).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ output: undefined, error: undefined })
    );
  });

  test('calls cases adapter for cases.create', async () => {
    const runtime = createRuntime();
    const ctxMgr = createContextManager(runtime);
    const services = { cases: { createCase: jest.fn().mockResolvedValue({ id: '1' }) } } as any;

    const step = new KbnApiStepImpl(
      {
        type: 'kibana.request',
        name: 'kbn',
        request: { method: 'POST', path: '/api/cases' },
        with: { api: 'cases.create', title: 'T', description: 'D' },
      } as any,
      services,
      ctxMgr,
      runtime
    );

    await step.run();

    expect(services.cases.createCase).toHaveBeenCalledWith({ title: 'T', description: 'D' });
    expect((runtime as any).setStepResult).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ output: { id: '1' }, error: undefined })
    );
  });

  test('calls cases adapter for cases.addComment', async () => {
    const runtime = createRuntime();
    const ctxMgr = createContextManager(runtime);
    const services = {
      cases: { addComment: jest.fn().mockResolvedValue({ id: '1', comment: 'c' }) },
    } as any;

    const step = new KbnApiStepImpl(
      {
        type: 'kibana.request',
        name: 'kbn',
        request: { method: 'POST', path: '/api/cases/1/comments' },
        with: { api: 'cases.addComment', caseId: '1', comment: 'hi' },
      } as any,
      services,
      ctxMgr,
      runtime
    );

    await step.run();

    expect(services.cases.addComment).toHaveBeenCalledWith('1', { comment: 'hi' });
    expect((runtime as any).setStepResult).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ output: { id: '1', comment: 'c' }, error: undefined })
    );
  });
});
