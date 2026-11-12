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
import type { CallKibanaApiParams } from '../lib/call_kibana_api';
import { callKibanaApi, CallKibanaApiResponseTooLargeError } from '../lib/call_kibana_api';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

describe('KibanaActionStepImpl', () => {
  let contextManager: any;
  let runtime: StepExecutionRuntime;
  let step: KibanaActionStepImpl;
  let workflowLogger: { logInfo: jest.Mock; logError: jest.Mock; logWarn: jest.Mock };

  const createStep = (withValue: any, stepType = 'kibana.request', maxStepSize = 1000) => {
    const node = {
      stepId: 'request',
      stepType,
      configuration: { type: stepType, with: withValue, 'max-step-size': maxStepSize },
    } as unknown as KibanaGraphNode;
    return new KibanaActionStepImpl(
      node,
      runtime,
      {} as WorkflowExecutionRuntimeManager,
      workflowLogger as unknown as IWorkflowEventLogger
    );
  };

  beforeEach(() => {
    workflowLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarn: jest.fn(),
    };
    contextManager = {
      renderValueAccordingToContext: jest.fn((value) => value),
      renderObjectAccordingToContextAsync: jest.fn(async (value) => value),
      getWorkflowSpaceId: jest.fn().mockReturnValue('default'),
      callKibanaApi: jest.fn().mockResolvedValue({
        status: 200,
        headers: {},
        body: { ok: true, success: true },
        url: 'http://localhost:5601/api/test',
      }),
      getCoreStart: jest.fn().mockReturnValue({
        security: { authc: { apiKeys: {} } },
        http: {
          basePath: {
            publicBaseUrl: 'https://localhost:5601',
            prepend: jest.fn((path: string) => `/base${path}`),
          },
          getServerInfo: jest.fn(() => ({
            protocol: 'https',
            hostname: 'internal-host',
            port: 5601,
          })),
        },
      }),
      getDependencies: jest.fn().mockReturnValue({ cloudSetup: undefined, config: {} }),
      getFakeRequest: jest.fn().mockReturnValue({
        headers: { authorization: 'ApiKey test-key' },
      }),
    };
    runtime = {
      contextManager,
      abortController: new AbortController(),
      getStepTimeoutMs: jest.fn(),
    } as unknown as StepExecutionRuntime;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core self-client', () => {
    it('calls the context manager adapter', async () => {
      step = createStep({ request: { method: 'POST', path: '/api/test', body: '{"x":1}' } });
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', path: '/api/test', body: '{"x":1}' })
      );
    });

    it('JSON-encodes a scalar string body when the request is JSON', async () => {
      step = createStep({ request: { method: 'POST', path: '/api/test', body: 'hello' } });
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
        expect.objectContaining({ body: '"hello"' })
      );
    });

    it.each([
      ['application/vnd.api+json; charset=utf-8', '"hello"'],
      ['application/jsonl', 'hello'],
    ])('encodes a scalar string body sent as %s to %s', async (contentType, expectedBody) => {
      step = createStep({
        request: {
          method: 'POST',
          path: '/api/test',
          body: 'hello',
          headers: { 'Content-Type': contentType },
        },
      });
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
        expect.objectContaining({ body: expectedBody })
      );
    });

    it('bounds the call by the step abort signal and the default headers timeout', async () => {
      step = createStep({ request: { method: 'GET', path: '/api/test' } });
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: runtime.abortController.signal,
          timeout: 300_000,
        })
      );
    });

    it('uses the step timeout as the headers timeout when set', async () => {
      jest.mocked(runtime.getStepTimeoutMs).mockReturnValue(600_000);
      step = createStep({ request: { method: 'GET', path: '/api/test' } });
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 600_000 })
      );
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

    it('rejects body together with form_data, including falsy bodies', async () => {
      for (const body of ['', false, 0, null, { title: 'kept' }]) {
        contextManager.callKibanaApi.mockClear();
        step = createStep({
          body,
          path: '/api/saved_objects/_import',
          form_data: { file: { content: 'hello', filename: 'a.ndjson' } },
        });
        const result = await (step as any)._run();
        expect(result.error.message).toContain('Cannot set both body and form_data');
        expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
      }
    });

    it('rejects invalid HTTP methods before calling the adapter', async () => {
      step = createStep({ method: 'POSTs', path: '/api/status' });
      const result = await (step as any)._run();
      expect(result.error.message).toContain('Invalid HTTP method "POSTs"');
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });

    it('throws when both use_server_info and use_localhost are true', async () => {
      step = createStep({
        request: { method: 'GET', path: '/api/status' },
        use_server_info: true,
        use_localhost: true,
      });
      await expect((step as any)._run()).rejects.toThrow(
        'Cannot set both use_server_info and use_localhost'
      );
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });

    it('converts adapter response-size failures to the step error', async () => {
      contextManager.callKibanaApi.mockRejectedValue(new CallKibanaApiResponseTooLargeError(1000));
      step = createStep({ request: { method: 'GET', path: '/api/test' } });
      const result = await (step as any)._run();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('size limit');
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

  describe('Core self-client through callKibanaApi', () => {
    const selfFetch = jest.fn();

    beforeEach(() => {
      contextManager.getWorkflowSpaceId.mockReturnValue('custom');
      selfFetch.mockImplementation(async () => ({
        request: { url: 'http://localhost:5601/api/test' },
        response: new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        }),
      }));
      const coreStart = contextManager.getCoreStart();
      coreStart.http.selfClient = { asScoped: jest.fn(() => ({ fetch: selfFetch })) };
      contextManager.callKibanaApi.mockImplementation((params: CallKibanaApiParams) =>
        callKibanaApi(
          { fakeRequest: contextManager.getFakeRequest(), coreStart, spaceId: 'custom' },
          params
        )
      );
    });

    it.each([
      [
        'a raw path',
        { request: { method: 'GET', path: '/api/cases' } },
        'kibana.request',
        '/api/cases',
      ],
      [
        'a raw path in another space',
        { request: { method: 'GET', path: '/s/other/api/cases' } },
        'kibana.request',
        '/s/other/api/cases',
      ],
      [
        'a raw path in the workflow space',
        { request: { method: 'GET', path: '/s/custom/api/cases' } },
        'kibana.request',
        '/s/custom/api/cases',
      ],
      [
        'a form_data path in another space',
        {
          path: '/s/other/api/saved_objects/_import',
          form_data: { file: { content: 'hello', filename: 'a.ndjson' } },
        },
        'kibana.request',
        '/s/other/api/saved_objects/_import',
      ],
      [
        'a generated connector path',
        { title: 'Test Case', description: 'Test Description', owner: 'securitySolution' },
        'kibana.createCase',
        '/s/custom/api/cases',
      ],
    ])('sends %s to the expected route', async (_, withValue, stepType, routePath) => {
      const result = await (createStep(withValue, stepType) as any)._run();
      expect(result.error).toBeUndefined();
      expect(selfFetch).toHaveBeenCalledTimes(1);
      expect(selfFetch.mock.calls[0][0]).toBe(`/base${routePath}`);
    });

    it('passes the step abort signal and the default headers timeout to Core', async () => {
      await (createStep({ request: { method: 'GET', path: '/api/test' } }) as any)._run();
      const options = selfFetch.mock.calls[0][1];
      expect(options.timeout).toBe(300_000);
      expect(options.signal).toBe(runtime.abortController.signal);
    });

    it('warns about and drops headers that Kibana sets', async () => {
      const result = await (
        createStep({
          request: {
            method: 'GET',
            path: '/api/test',
            headers: { 'kbn-version': '9.0.0', Cookie: 'sid=1', 'x-custom': 'kept' },
          },
        }) as any
      )._run();
      expect(result.error).toBeUndefined();
      expect(workflowLogger.logWarn).toHaveBeenCalledWith(
        'Ignoring headers that Kibana sets for Kibana steps: kbn-version, Cookie.',
        expect.objectContaining({ tags: ['kibana'] })
      );
      const { headers } = selfFetch.mock.calls[0][1];
      expect(headers).not.toHaveProperty('kbn-version');
      expect(headers).not.toHaveProperty('Cookie');
      expect(headers['x-custom']).toBe('kept');
    });

    it('fails with the HTTP status and a truncated message when an error body exceeds max-step-size', async () => {
      const chunks = ['E'.repeat(1024), 'E'.repeat(2 * 1024 * 1024)].map((chunk) =>
        new TextEncoder().encode(chunk)
      );
      selfFetch.mockImplementation(async () => ({
        request: { url: 'http://localhost:5601/api/broken' },
        response: {
          ok: false,
          status: 500,
          headers: new Headers({ 'content-type': 'text/plain' }),
          body: {
            getReader: () => ({
              read: async () =>
                chunks.length > 0 ? { done: false, value: chunks.shift() } : { done: true },
              cancel: jest.fn(),
              releaseLock: jest.fn(),
            }),
          },
        },
      }));
      const result = await (
        createStep({ request: { method: 'GET', path: '/api/broken' } }) as any
      )._run();
      expect(result.error.type).toBe('KibanaApiCallError');
      expect(result.error.message).toBe(`HTTP 500: ${'E'.repeat(1024)}... [truncated]`);
    });
  });

  describe('other kibana.* step types', () => {
    it('uses Core self-client', async () => {
      step = createStep({ request: { method: 'GET', path: '/api/status' } }, 'kibana.getCase');
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalled();
    });

    it('builds generated connector requests through the self-client adapter', async () => {
      step = createStep(
        { title: 'Test Case', description: 'Test Description', owner: 'securitySolution' },
        'kibana.createCase'
      );
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/cases',
          body: expect.objectContaining({
            title: 'Test Case',
            description: 'Test Description',
            owner: 'securitySolution',
          }),
        })
      );
    });

    it('does not forward use_server_info, use_localhost, or debug on generated connectors', async () => {
      step = createStep(
        {
          title: 'Test Case',
          description: 'Test Description',
          owner: 'securitySolution',
          use_server_info: false,
          use_localhost: false,
          debug: true,
        },
        'kibana.createCase'
      );
      await (step as any)._run();
      const call = contextManager.callKibanaApi.mock.calls[0][0];
      expect(call.body.use_server_info).toBeUndefined();
      expect(call.body.use_localhost).toBeUndefined();
      expect(call.body.debug).toBeUndefined();
      expect(call.body.title).toBe('Test Case');
    });

    it('warns and ignores YAML fetcher', async () => {
      step = createStep(
        {
          request: { method: 'GET', path: '/api/status' },
          fetcher: { skip_ssl_verification: true },
        },
        'kibana.getCase'
      );
      await (step as any)._run();
      expect(workflowLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('fetcher'),
        expect.objectContaining({ tags: expect.arrayContaining(['deprecated']) })
      );
      expect(contextManager.callKibanaApi).toHaveBeenCalled();
    });
  });

  describe('getInput', () => {
    it('renders `with` with the async renderer', async () => {
      const withValue = { method: 'GET', path: '/api/{{ inputs.id }}' };
      contextManager.renderObjectAccordingToContextAsync.mockResolvedValue({
        method: 'GET',
        path: '/api/1',
      });

      await expect(createStep(withValue).getInput()).resolves.toEqual({
        method: 'GET',
        path: '/api/1',
      });
      expect(contextManager.renderObjectAccordingToContextAsync).toHaveBeenCalledWith(withValue);
    });
  });
});
