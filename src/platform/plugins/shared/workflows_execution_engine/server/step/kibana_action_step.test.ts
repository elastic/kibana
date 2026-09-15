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
  let workflowLogger: { logInfo: jest.Mock; logError: jest.Mock; logWarn: jest.Mock };

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
      workflowLogger as unknown as IWorkflowEventLogger
    );
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    workflowLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarn: jest.fn(),
    };
    contextManager = {
      renderValueAccordingToContext: jest.fn((value) => value),
      getWorkflowSpaceId: jest.fn().mockReturnValue('default'),
      callKibanaApi: jest.fn().mockResolvedValue({
        status: 200,
        headers: {},
        body: { ok: true },
        url: 'http://localhost:5601/api/test',
      }),
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

  it('encodes binary form_data content as a Blob', async () => {
    step = createStep({
      form_data: { file: { content: new Uint8Array([1, 2, 3]), filename: 'a.bin' } },
    });
    await (step as any)._run();
    const call = contextManager.callKibanaApi.mock.calls[0][0];
    expect(call.rawBody).toBeInstanceOf(FormData);
    expect(call.body).toBeUndefined();
  });

  it('warns when YAML fetcher is present and still calls the adapter', async () => {
    step = createStep({
      request: { method: 'GET', path: '/api/test' },
      fetcher: { skip_ssl_verification: true },
    });
    await (step as any)._run();
    expect(workflowLogger.logWarn).toHaveBeenCalledWith(
      expect.stringContaining('fetcher'),
      expect.objectContaining({ tags: expect.arrayContaining(['deprecated']) })
    );
    expect(contextManager.callKibanaApi).toHaveBeenCalled();
  });

  it('includes the outbound URL in debug output', async () => {
    step = createStep({
      request: { method: 'GET', path: '/api/test' },
      debug: true,
    });
    const result = await (step as any)._run();
    expect(result.output._debug).toEqual({
      method: 'GET',
      fullUrl: 'http://localhost:5601/api/test',
    });
  });

  it('warns that use_localhost uses the listener, not hardcoded localhost:5601', async () => {
    step = createStep({
      request: { method: 'GET', path: '/api/test' },
      use_localhost: true,
    });
    await (step as any)._run();
    expect(workflowLogger.logWarn).toHaveBeenCalledWith(
      expect.stringContaining('use_localhost'),
      expect.objectContaining({ tags: expect.arrayContaining(['kibana']) })
    );
    expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'local' })
    );
  });
});
