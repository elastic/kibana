/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaGraphNode } from '@kbn/workflows/graph/types';
import { KibanaActionStepImpl } from './kibana_action_step';
import { CallKibanaApiResponseTooLargeError } from '../lib/call_kibana_api';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

describe('KibanaActionStepImpl', () => {
  const originalFetch = global.fetch;
  let contextManager: any;
  let runtime: StepExecutionRuntime;
  let step: KibanaActionStepImpl;

  const createStep = (withValue: any) => {
    const node = {
      stepId: 'request',
      stepType: 'kibana.request',
      configuration: { type: 'kibana.request', with: withValue, 'max-step-size': 1000 },
    } as unknown as KibanaGraphNode;
    return new KibanaActionStepImpl(
      node,
      runtime,
      {} as WorkflowExecutionRuntimeManager,
      { logInfo: jest.fn(), logError: jest.fn() } as unknown as IWorkflowEventLogger
    );
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    contextManager = {
      renderValueAccordingToContext: jest.fn((value) => value),
      getWorkflowSpaceId: jest.fn().mockReturnValue('default'),
      callKibanaApi: jest.fn().mockResolvedValue({ status: 200, headers: {}, body: { ok: true } }),
    };
    runtime = { contextManager } as unknown as StepExecutionRuntime;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls the context manager adapter and never global fetch', async () => {
    step = createStep({ request: { method: 'POST', path: '/api/test', body: '{"x":1}' } });
    await (step as any)._run();
    expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/api/test', body: '{"x":1}' })
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('preserves JSON strings and caller content type', async () => {
    step = createStep({
      request: {
        method: 'POST',
        path: '/api/test',
        body: '{"x":1}',
        headers: { 'Content-Type': 'text/plain' },
      },
    });
    await (step as any)._run();
    expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ body: '{"x":1}', headers: { 'Content-Type': 'text/plain' } })
    );
  });

  it('uses raw buffered FormData for form_data requests', async () => {
    step = createStep({ form_data: { file: { content: 'hello', filename: 'a.txt' } } });
    await (step as any)._run();
    const call = contextManager.callKibanaApi.mock.calls[0][0];
    expect(call.rawBody).toBeInstanceOf(FormData);
    expect(call.body).toBeUndefined();
  });

  it('converts adapter response-size failures to the step error', async () => {
    contextManager.callKibanaApi.mockRejectedValue(new CallKibanaApiResponseTooLargeError(1000));
    step = createStep({ request: { method: 'GET', path: '/api/test' } });
    const result = await (step as any)._run();
    expect(result.error).toBeDefined();
    expect(result.error.message).toContain('size limit');
  });

  it('does not double-prefix generated non-default-space paths', async () => {
    contextManager.getWorkflowSpaceId.mockReturnValue('custom');
    step = createStep({ request: { method: 'GET', path: '/api/test' } });
    await (step as any)._run();
    expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/test' })
    );
  });

  it('strips an existing current-space prefix from raw request paths', async () => {
    contextManager.getWorkflowSpaceId.mockReturnValue('custom');
    step = createStep({ request: { method: 'GET', path: '/s/custom/api/test' } });
    await (step as any)._run();
    expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/test' })
    );
  });

  it('strips an existing current-space prefix from form_data paths', async () => {
    contextManager.getWorkflowSpaceId.mockReturnValue('custom');
    step = createStep({
      path: '/s/custom/api/test',
      form_data: { file: { content: 'hello', filename: 'a.txt' } },
    });
    await (step as any)._run();
    expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/test' })
    );
  });
});
