/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { EsApiStepImpl } from './es_api_step';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import { graphlib } from '@dagrejs/dagre';

const createMockEsClient = () => {
  return {
    transport: {
      request: jest.fn(),
    },
  } as unknown as ElasticsearchClient;
};

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

  // Spy on methods used by StepBase with correct signatures
  jest.spyOn(mgr as any, 'startStep').mockImplementation(async (_stepId: string) => {});
  jest
    .spyOn(mgr as any, 'setStepResult')
    .mockImplementation(async (_stepId: string, _result: any) => {});
  jest.spyOn(mgr as any, 'finishStep').mockImplementation(async (_stepId: string) => {});
  jest.spyOn(mgr as any, 'getCurrentStep').mockReturnValue({ id: 's1' });
  jest.spyOn(mgr as any, 'getStepResult').mockReturnValue(undefined);
  jest.spyOn(mgr as any, 'getStepState').mockReturnValue(undefined);

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

describe('EsApiStepImpl', () => {
  test('calls transport.request with rendered inputs and stores result', async () => {
    const runtime = createRuntime();
    const ctxMgr = createContextManager(runtime);
    const es = createMockEsClient();
    (es.transport.request as jest.Mock).mockResolvedValue({ ok: true, statusCode: 200, hits: 1 });

    const step = new EsApiStepImpl(
      {
        type: 'elasticsearch.request',
        name: 'es',
        request: {
          method: 'GET',
          path: '/_cluster/health',
          query: { level: 'cluster' },
          headers: { 'x-test': '1' },
        },
      } as any,
      es,
      ctxMgr,
      runtime
    );

    await step.run();

    expect(es.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/_cluster/health',
        querystring: { level: 'cluster' },
      }),
      expect.objectContaining({ headers: { 'x-test': '1' } })
    );
    expect((runtime as any).setStepResult).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ output: expect.any(Object), error: undefined })
    );
  });

  test('stores error on failure', async () => {
    const runtime = createRuntime();
    const ctxMgr = createContextManager(runtime);
    const es = createMockEsClient();
    (es.transport.request as jest.Mock).mockRejectedValue(new Error('boom'));

    const step = new EsApiStepImpl(
      {
        type: 'elasticsearch.request',
        name: 'es',
        request: { method: 'GET', path: '/_x' },
      } as any,
      es,
      ctxMgr,
      runtime
    );

    await step.run();

    expect((runtime as any).setStepResult).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ output: undefined, error: 'boom' })
    );
  });
});
