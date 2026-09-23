/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  markExternalUiamCredential,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
} from '@kbn/core-security-server';
import type { KibanaGraphNode } from '@kbn/workflows/graph/types';
import { KibanaActionStepImpl } from './kibana_action_step';
import { CallKibanaApiResponseTooLargeError } from '../lib/call_kibana_api';
import { WorkflowTemplatingEngine } from '../templating_engine';
import {
  EVENT_CHAIN_DEPTH_HEADER,
  EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '../trigger_events/event_context/event_chain_context';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation((options) => ({
    _options: options,
  })),
}));

describe('KibanaActionStepImpl', () => {
  const originalFetch = global.fetch;
  let contextManager: any;
  let runtime: StepExecutionRuntime;
  let step: KibanaActionStepImpl;
  let workflowLogger: { logInfo: jest.Mock; logError: jest.Mock; logWarn: jest.Mock };
  const mockGetBooleanValue = jest.fn().mockResolvedValue(true);

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

  const streamResponse = (
    body: string | Uint8Array,
    {
      status = 200,
      contentType = 'application/json',
      cancel = jest.fn(),
    }: { status?: number; contentType?: string | null; cancel?: jest.Mock } = {}
  ): Response => {
    const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
      },
      body: {
        getReader: () => {
          let done = false;
          return {
            read: async () => {
              if (done) {
                return { done: true, value: undefined };
              }
              done = true;
              return { done: false, value: bytes };
            },
            cancel,
            releaseLock: jest.fn(),
          };
        },
      },
    } as unknown as Response;
  };

  const jsonResponse = (body: unknown, status = 200): Response =>
    streamResponse(typeof body === 'string' ? body : JSON.stringify(body), { status });

  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ ok: true, success: true })));
    mockGetBooleanValue.mockResolvedValue(true);
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
        body: { ok: true, success: true },
        url: 'http://localhost:5601/api/test',
      }),
      getCoreStart: jest.fn().mockReturnValue({
        featureFlags: { getBooleanValue: mockGetBooleanValue },
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
    runtime = { contextManager } as unknown as StepExecutionRuntime;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Core self-client (kibana.request flag on)', () => {
    beforeEach(() => {
      mockGetBooleanValue.mockResolvedValue(true);
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

    it('converts adapter response-size failures to the step error', async () => {
      contextManager.callKibanaApi.mockRejectedValue(new CallKibanaApiResponseTooLargeError(1000));
      step = createStep({ request: { method: 'GET', path: '/api/test' } });
      const result = await (step as any)._run();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('size limit');
    });

    it('does not prefix raw request paths that have no current-space prefix', async () => {
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
      expect(global.fetch).not.toHaveBeenCalled();
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

  describe('legacy fetch (kibana.request flag off)', () => {
    beforeEach(() => {
      mockGetBooleanValue.mockResolvedValue(false);
    });

    it('forwards only Core-generated UIAM attestation headers', async () => {
      const getInternalCallerAttestationHeaders = jest.fn().mockReturnValue({
        [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: 'valid-attestation',
      });
      contextManager.getCoreStart().security.authc.apiKeys.uiam = {
        getInternalCallerAttestationHeaders,
      };
      contextManager.getFakeRequest.mockReturnValue({
        headers: { authorization: 'ApiKey essu_internal_key' },
      } as unknown as KibanaRequest);
      step = createStep({
        request: {
          method: 'GET',
          path: '/api/status',
          headers: {
            Authorization: 'ApiKey forged_key',
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: 'forged-attestation',
            [EVENT_CHAIN_DEPTH_HEADER]: '999',
          },
        },
      });

      await (step as any)._run();

      const headers = new Headers((global.fetch as jest.Mock).mock.calls[0][1].headers);
      expect(headers.get('authorization')).toBe('ApiKey essu_internal_key');
      expect(headers.get(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER)).toBe('valid-attestation');
      expect(headers.get(EVENT_CHAIN_DEPTH_HEADER)).toBeNull();
      expect(getInternalCallerAttestationHeaders).toHaveBeenCalledTimes(1);

      (global.fetch as jest.Mock).mockClear();
      getInternalCallerAttestationHeaders.mockClear();
      const externalRequest = {
        headers: { authorization: 'ApiKey essu_user_created_key' },
        isFakeRequest: true,
      } as unknown as KibanaRequest;
      markExternalUiamCredential(externalRequest);
      contextManager.getFakeRequest.mockReturnValue(externalRequest);

      await (step as any)._run();

      const externalHeaders = new Headers((global.fetch as jest.Mock).mock.calls[0][1].headers);
      expect(externalHeaders.get(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER)).toBeNull();
      expect(getInternalCallerAttestationHeaders).not.toHaveBeenCalled();
    });

    it('uses global fetch and never the self-client adapter', async () => {
      step = createStep({ request: { method: 'POST', path: '/api/test', body: { x: 1 } } });
      await (step as any)._run();
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost:5601/api/test',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles the top-level kibana.request method/path format', async () => {
      step = createStep({ method: 'GET', path: '/api/status' });
      await (step as any)._run();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost:5601/api/status',
        expect.objectContaining({ method: 'GET' })
      );
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });

    it('rejects invalid HTTP methods before calling fetch', async () => {
      step = createStep({ method: 'POSTs', path: '/api/status' });
      const result = await (step as any)._run();
      expect(result.error.message).toContain('Invalid HTTP method "POSTs"');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects body together with form_data, including falsy bodies', async () => {
      for (const body of ['', false, 0, null, { title: 'kept' }]) {
        (global.fetch as jest.Mock).mockClear();
        step = createStep({
          body,
          path: '/api/saved_objects/_import',
          form_data: { file: { content: 'hello', filename: 'a.ndjson' } },
        });
        const result = await (step as any)._run();
        expect(result.error.message).toContain('Cannot set both body and form_data');
        expect(global.fetch).not.toHaveBeenCalled();
      }
    });

    it('extracts fetcher options and does not include them in the request body', async () => {
      step = createStep({
        request: {
          method: 'POST',
          path: '/api/cases',
          body: { title: 'Test', description: 'Test Description', owner: 'securitySolution' },
        },
        fetcher: { skip_ssl_verification: true },
      });
      await (step as any)._run();

      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      const requestBody = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};
      expect(requestBody.fetcher).toBeUndefined();
      expect(requestBody.title).toBe('Test');
      expect(requestBody.description).toBe('Test Description');
      expect(requestBody.owner).toBe('securitySolution');
    });

    it('works without fetcher options and does not attach a dispatcher', async () => {
      step = createStep({ request: { method: 'GET', path: '/api/status' } });
      await (step as any)._run();
      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      expect((fetchOptions as any).dispatcher).toBeUndefined();
    });

    it('creates an undici Agent with rejectUnauthorized: false when skip_ssl_verification is true', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      step = createStep({
        request: { method: 'GET', path: '/api/test' },
        fetcher: { skip_ssl_verification: true },
      });
      await (step as any)._run();

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          connect: expect.objectContaining({
            rejectUnauthorized: false,
          }),
        })
      );
    });

    it('does not create an Agent when skip_ssl_verification is absent', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      step = createStep({ request: { method: 'GET', path: '/api/test' } });
      await (step as any)._run();
      expect(MockedAgent).not.toHaveBeenCalled();
    });

    it('passes keep_alive to the Agent', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      step = createStep({
        request: { method: 'GET', path: '/api/test' },
        fetcher: { keep_alive: true },
      });
      await (step as any)._run();

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          keepAliveTimeout: 60000,
          keepAliveMaxTimeout: 600000,
        })
      );
    });

    it('sets redirect mode when follow_redirects is false', async () => {
      step = createStep({
        request: { method: 'GET', path: '/api/test' },
        fetcher: { follow_redirects: false },
      });
      await (step as any)._run();

      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      expect(fetchOptions.redirect).toBe('manual');
    });

    it('passes max_redirects to the Agent', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      step = createStep({
        request: { method: 'GET', path: '/api/test' },
        fetcher: { max_redirects: 10 },
      });
      await (step as any)._run();

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRedirections: 10,
        })
      );
    });

    it('passes through custom undici options', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      step = createStep({
        request: { method: 'GET', path: '/api/test' },
        fetcher: { connections: 100, pipelining: 10 },
      });
      await (step as any)._run();

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: 100,
          pipelining: 10,
        })
      );
    });

    it('applies YAML fetcher without an ignore warning', async () => {
      step = createStep({
        request: { method: 'GET', path: '/api/test' },
        fetcher: { skip_ssl_verification: true, follow_redirects: false },
      });
      await (step as any)._run();
      expect(workflowLogger.logWarn).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost:5601/api/test',
        expect.objectContaining({
          redirect: 'manual',
          dispatcher: expect.any(Object),
        })
      );
    });

    it('uses server info URL when use_server_info is true', async () => {
      step = createStep({
        request: { method: 'GET', path: '/api/status' },
        use_server_info: true,
      });
      await (step as any)._run();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://internal-host:5601/base/api/status',
        expect.any(Object)
      );
      expect((global.fetch as jest.Mock).mock.calls[0][0]).not.toContain(
        'public.kibana.example.com'
      );
    });

    it('uses hardcoded localhost when use_localhost is true', async () => {
      step = createStep({
        request: { method: 'GET', path: '/api/status' },
        use_localhost: true,
      });
      await (step as any)._run();
      expect(workflowLogger.logWarn).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/status',
        expect.any(Object)
      );
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
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('includes _debug with fullUrl when debug is true', async () => {
      step = createStep({
        request: { method: 'POST', path: '/api/cases', body: { title: 'Test' } },
        debug: true,
      });
      const result = await (step as any)._run();
      expect(result.output._debug).toEqual({
        fullUrl: 'https://localhost:5601/api/cases',
        method: 'POST',
      });
    });

    it('does not include _debug when debug is absent', async () => {
      step = createStep({ request: { method: 'GET', path: '/api/status' } });
      const result = await (step as any)._run();
      expect(result.output._debug).toBeUndefined();
    });

    it('includes _debug.kibanaUrl in error details when debug is true and the request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response('Internal Server Error', { status: 500 })
      );
      step = createStep({
        request: { method: 'POST', path: '/api/bad-endpoint' },
        debug: true,
      });
      const result = await (step as any)._run();
      expect(result.error).toBeDefined();
      expect(result.error.details._debug.kibanaUrl).toBe('https://localhost:5601');
    });

    it('includes query params in _debug.fullUrl', async () => {
      step = createStep({
        request: { method: 'GET', path: '/api/cases', query: { page: '1', perPage: '10' } },
        debug: true,
      });
      const result = await (step as any)._run();
      expect(result.output._debug.fullUrl).toBe(
        'https://localhost:5601/api/cases?page=1&perPage=10'
      );
    });

    it('does not forward use_server_info, use_localhost, or debug in the request body', async () => {
      step = createStep({
        request: {
          method: 'POST',
          path: '/api/cases',
          body: { title: 'Test Case', description: 'Test Description', owner: 'securitySolution' },
        },
        use_server_info: false,
        use_localhost: false,
        debug: true,
      });
      await (step as any)._run();

      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      const requestBody = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};
      expect(requestBody.use_server_info).toBeUndefined();
      expect(requestBody.use_localhost).toBeUndefined();
      expect(requestBody.debug).toBeUndefined();
      expect(requestBody.title).toBe('Test Case');
    });

    it('forwards authentication, origin, and workflow execution headers on the outbound request', async () => {
      (runtime as any).workflowExecution = { id: 'workflow-run-helper' };
      step = createStep({ request: { method: 'GET', path: '/api/status' } });
      await (step as any)._run();
      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers as Record<
        string,
        string
      >;
      expect(headers.Authorization).toBe('ApiKey test-key');
      expect(headers['kbn-xsrf']).toBe('true');
      expect(headers[X_ELASTIC_INTERNAL_ORIGIN_REQUEST]).toBe('Kibana');
      expect(headers[EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]).toBe('workflow-run-helper');
    });

    it('sends form_data as multipart FormData', async () => {
      step = createStep({
        path: '/api/saved_objects/_import',
        form_data: { file: { content: 'hello', filename: 'a.ndjson' } },
      });
      await (step as any)._run();
      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      expect(fetchOptions.body).toBeInstanceOf(FormData);
      expect(fetchOptions.method).toBe('POST');
    });

    it('preserves binary multipart content and its MIME type', async () => {
      const content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe]);
      const input = new WorkflowTemplatingEngine().render(
        {
          path: '/api/cases/case-id/files',
          form_data: {
            file: {
              content: '${{ screenshot | base64_decode_bytes }}',
              filename: 'screenshot.png',
              content_type: 'image/png',
            },
          },
        },
        { screenshot: content.toString('base64') }
      );
      step = createStep(input);
      await (step as any)._run();

      const formData = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
      const file = formData.get('file') as Blob;
      expect(file.type).toBe('image/png');
      expect(Buffer.from(await file.arrayBuffer())).toEqual(content);
    });

    it('returns empty output with and without debug details for 204 responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
        headers: { get: () => null },
        body: null,
      });
      const withoutDebugStep = createStep({
        request: { method: 'DELETE', path: '/api/cases/1' },
      });
      expect((await (withoutDebugStep as any)._run()).output).toEqual({});

      const withDebugStep = createStep({
        request: { method: 'DELETE', path: '/api/cases/1' },
        debug: true,
      });
      const result = await (withDebugStep as any)._run();
      expect(result.error).toBeUndefined();
      expect(result.output).toEqual({
        _debug: { fullUrl: 'https://localhost:5601/api/cases/1', method: 'DELETE' },
      });
    });

    it.each([
      ['application/json', '{"id":"case-1","title":"Test"}', { id: 'case-1', title: 'Test' }],
      ['text/plain', 'Hello plain text', 'Hello plain text'],
    ])(
      'parses %s responses without changing their body shape',
      async (contentType, body, expected) => {
        (global.fetch as jest.Mock).mockResolvedValue(streamResponse(body, { contentType }));
        const responseStep = createStep({ request: { method: 'GET', path: '/api/response' } });
        const result = await (responseStep as any)._run();
        expect(result.error).toBeUndefined();
        expect(result.output).toEqual(expected);
        expect(Buffer.isBuffer(result.output)).toBe(false);
      }
    );

    it.each([
      'image/png',
      'application/pdf',
      'application/octet-stream',
      'image/png; charset=binary',
      'application/x-custom-format',
      null,
    ])('returns exact bytes for binary response content type %s', async (contentType) => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe]);
      (global.fetch as jest.Mock).mockResolvedValue(streamResponse(bytes, { contentType }));
      const binaryResponseStep = createStep({ request: { method: 'GET', path: '/api/export' } });
      const result = await (binaryResponseStep as any)._run();
      expect(result.error).toBeUndefined();
      expect(Buffer.isBuffer(result.output)).toBe(true);
      expect(result.output).toEqual(Buffer.from(bytes));
    });

    it.each(['application/json', 'image/png'])(
      'enforces max-step-size and cancels oversized %s responses',
      async (contentType) => {
        const cancel = jest.fn();
        (global.fetch as jest.Mock).mockResolvedValue(
          streamResponse(new Uint8Array(2000), { contentType, cancel })
        );
        const oversizedResponseStep = createStep(
          { request: { method: 'GET', path: '/api/large' } },
          'kibana.request',
          100
        );
        const result = await (oversizedResponseStep as any)._run();
        expect(result.error.type).toBe('StepSizeLimitExceeded');
        expect(cancel).toHaveBeenCalled();
      }
    );

    it('truncates oversized error response bodies', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        streamResponse('E'.repeat(2 * 1024 * 1024), { status: 500 })
      );
      step = createStep({ request: { method: 'GET', path: '/api/broken' } });
      const result = await (step as any)._run();
      expect(result.error.message.length).toBeLessThan(1.5 * 1024 * 1024);
      expect(result.error.message).toContain('... [truncated]');
    });

    it('handles multiple fetcher options together', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      step = createStep({
        request: { method: 'GET', path: '/api/test' },
        fetcher: {
          skip_ssl_verification: true,
          keep_alive: true,
          max_redirects: 5,
          follow_redirects: false,
        },
      });
      await (step as any)._run();

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          connect: expect.objectContaining({
            rejectUnauthorized: false,
          }),
          keepAliveTimeout: 60000,
          keepAliveMaxTimeout: 600000,
          maxRedirections: 5,
        })
      );
      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      expect(fetchOptions.redirect).toBe('manual');
    });
  });

  describe('other kibana.* step types', () => {
    it('uses legacy fetch and applies YAML fetcher when the flag is off', async () => {
      mockGetBooleanValue.mockResolvedValue(false);
      step = createStep(
        {
          title: 'Test Case',
          description: 'Test Description',
          owner: 'securitySolution',
          fetcher: { follow_redirects: false },
        },
        'kibana.createCase'
      );
      await (step as any)._run();
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
      expect(workflowLogger.logWarn).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost:5601/api/cases',
        expect.objectContaining({ method: 'POST', redirect: 'manual' })
      );
      expect(mockGetBooleanValue).toHaveBeenCalled();
    });

    it('uses Core self-client when the flag is on', async () => {
      mockGetBooleanValue.mockResolvedValue(true);
      step = createStep({ request: { method: 'GET', path: '/api/status' } }, 'kibana.getCase');
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockGetBooleanValue).toHaveBeenCalled();
    });

    it('does not double-prefix generated non-default-space paths', async () => {
      contextManager.getWorkflowSpaceId.mockReturnValue('custom');
      step = createStep(
        { title: 'Test Case', description: 'Test Description', owner: 'securitySolution' },
        'kibana.createCase'
      );
      await (step as any)._run();
      expect(contextManager.callKibanaApi).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', path: '/api/cases' })
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('builds generated connector requests through the self-client adapter', async () => {
      mockGetBooleanValue.mockResolvedValue(true);
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
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not forward use_server_info, use_localhost, or debug on generated connectors', async () => {
      mockGetBooleanValue.mockResolvedValue(true);
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

    it('warns and ignores YAML fetcher when the flag is on', async () => {
      mockGetBooleanValue.mockResolvedValue(true);
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
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
