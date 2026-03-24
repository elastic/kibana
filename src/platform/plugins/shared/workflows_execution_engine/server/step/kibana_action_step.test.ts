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
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Mock fetch globally
global.fetch = jest.fn();
const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

function createMockReadableStream(data: string) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  let consumed = false;
  return {
    getReader: () => ({
      read: async () => {
        if (consumed) return { done: true, value: undefined };
        consumed = true;
        return { done: false, value: encoded };
      },
      releaseLock: () => {},
      cancel: jest.fn(),
    }),
  };
}

function createMockResponse(body: object, status = 200) {
  const json = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(json),
    body: createMockReadableStream(json),
  } as any;
}

// Mock undici
jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation((options) => ({
    _options: options, // Store options for testing
  })),
}));

describe('KibanaActionStepImpl - Fetcher Configuration', () => {
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockContextManager: jest.Mocked<WorkflowContextManager>;

  beforeEach(() => {
    mockContextManager = {
      getContext: jest.fn().mockReturnValue({
        workflow: { spaceId: 'default' },
      }),
      renderValueAccordingToContext: jest.fn((value) => value),
      getCoreStart: jest.fn().mockReturnValue({
        http: {
          basePath: { publicBaseUrl: 'https://localhost:5601' },
        },
      }),
      getFakeRequest: jest.fn().mockReturnValue({
        headers: { authorization: 'ApiKey test-key' },
      }),
      getDependencies: jest.fn().mockReturnValue({}),
    } as any;

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      finishStep: jest.fn().mockResolvedValue(undefined),
      failStep: jest.fn().mockResolvedValue(undefined),
      setInput: jest.fn().mockResolvedValue(undefined),
      stepExecutionId: 'test-step-exec-id',
      node: {},
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    mockWorkflowLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
    } as any;

    // Mock successful fetch response with readable body stream
    mockedFetch.mockResolvedValue(createMockResponse({ success: true }));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('fetcher options extraction', () => {
    it('should extract fetcher options and not include them in request body', async () => {
      const stepWith = {
        title: 'Test Case',
        description: 'Test Description',
        owner: 'securitySolution',
        fetcher: {
          skip_ssl_verification: true,
        },
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      // Verify fetch was called
      expect(mockedFetch).toHaveBeenCalled();

      // Get the request body from the fetch call
      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;
      const requestBody = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};

      // Verify fetcher is NOT in the request body
      expect(requestBody.fetcher).toBeUndefined();

      // Verify actual case parameters are in the body
      expect(requestBody.title).toBe('Test Case');
      expect(requestBody.description).toBe('Test Description');
      expect(requestBody.owner).toBe('securitySolution');
    });

    it('should handle raw API format and extract fetcher', async () => {
      const stepWith = {
        request: {
          method: 'POST',
          path: '/api/cases',
          body: { title: 'Test' },
        },
        fetcher: {
          skip_ssl_verification: true,
        },
      };
      const step = {
        id: 'test_step',
        type: 'kibana.api',
        stepId: 'test_step',
        stepType: 'kibana.api',
        configuration: { name: 'test_step', type: 'kibana.api', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      expect(mockedFetch).toHaveBeenCalled();

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;
      const requestBody = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};

      // Verify fetcher is NOT in the request body
      expect(requestBody.fetcher).toBeUndefined();
      expect(requestBody.title).toBe('Test');
    });

    it('should work without fetcher options', async () => {
      const stepWith = {
        title: 'Test Case',
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      expect(mockedFetch).toHaveBeenCalled();

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;

      // Should not have dispatcher (Agent) when no fetcher options
      expect((fetchOptions as any).dispatcher).toBeUndefined();
    });
  });

  describe('SSL verification', () => {
    it('should create undici Agent with rejectUnauthorized: false when skip_ssl_verification is true', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const stepWith = {
        title: 'Test',
        fetcher: {
          skip_ssl_verification: true,
        },
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      // Verify Agent was created with correct options
      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          connect: expect.objectContaining({
            rejectUnauthorized: false,
          }),
        })
      );
    });

    it('should not create Agent when skip_ssl_verification is false or undefined', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const stepWith = {
        title: 'Test',
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      // Agent should not be created
      expect(MockedAgent).not.toHaveBeenCalled();
    });
  });

  describe('other fetcher options', () => {
    it('should pass keep_alive option to Agent', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const stepWith = {
        title: 'Test',
        fetcher: {
          keep_alive: true,
        },
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          keepAliveTimeout: 60000,
          keepAliveMaxTimeout: 600000,
        })
      );
    });

    it('should set redirect mode when follow_redirects is false', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const stepWith = {
        title: 'Test',
        fetcher: {
          follow_redirects: false,
        },
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;

      expect(fetchOptions.redirect).toBe('manual');
    });

    it('should pass max_redirects to Agent', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const stepWith = {
        title: 'Test',
        fetcher: {
          max_redirects: 10,
        },
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRedirections: 10,
        })
      );
    });

    it('should pass through custom undici options', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const stepWith = {
        title: 'Test',
        fetcher: {
          connections: 100,
          pipelining: 10,
        } as Record<string, unknown>,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: 100,
          pipelining: 10,
        })
      );
    });
  });

  describe('use_server_info option', () => {
    it('should use server info URL when use_server_info is true', async () => {
      mockContextManager.getCoreStart.mockReturnValue({
        http: {
          basePath: {
            publicBaseUrl: 'https://public.kibana.example.com',
            prepend: jest.fn((path: string) => `/base${path}`),
          },
          getServerInfo: jest.fn(() => ({
            protocol: 'https',
            hostname: 'internal-host',
            port: 5601,
          })),
        },
      } as any);

      const stepWith = {
        method: 'GET',
        path: '/api/status',
        use_server_info: true,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.request',
        stepId: 'test_step',
        stepType: 'kibana.request',
        configuration: { name: 'test_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchedUrl = fetchCall[0] as string;
      expect(fetchedUrl).toBe('https://internal-host:5601/base/api/status');
      expect(fetchedUrl).not.toContain('public.kibana.example.com');
    });
  });

  describe('use_localhost option', () => {
    it('should use localhost URL when use_localhost is true', async () => {
      const stepWith = {
        method: 'GET',
        path: '/api/status',
        use_localhost: true,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.request',
        stepId: 'test_step',
        stepType: 'kibana.request',
        configuration: { name: 'test_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchedUrl = fetchCall[0] as string;
      expect(fetchedUrl).toBe('http://localhost:5601/api/status');
    });
  });

  describe('use_server_info and use_localhost mutual exclusion', () => {
    it('should throw an error when both use_server_info and use_localhost are true', async () => {
      const stepWith = {
        method: 'GET',
        path: '/api/status',
        use_server_info: true,
        use_localhost: true,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.request',
        stepId: 'test_step',
        stepType: 'kibana.request',
        configuration: { name: 'test_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await expect((kibanaStep as any)._run(stepWith)).rejects.toThrow(
        'Cannot set both use_server_info and use_localhost'
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });
  });

  describe('debug option', () => {
    it('should include _debug with fullUrl in output when debug is true', async () => {
      const stepWith = {
        method: 'POST',
        path: '/api/cases',
        body: { title: 'Test' },
        debug: true,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.request',
        stepId: 'test_step',
        stepType: 'kibana.request',
        configuration: { name: 'test_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.output._debug).toBeDefined();
      expect(result.output._debug.fullUrl).toBe('https://localhost:5601/api/cases');
      expect(result.output._debug.method).toBe('POST');
    });

    it('should not include _debug when debug is false or absent', async () => {
      const stepWith = {
        method: 'GET',
        path: '/api/status',
      };
      const step = {
        id: 'test_step',
        type: 'kibana.request',
        stepId: 'test_step',
        stepType: 'kibana.request',
        configuration: { name: 'test_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.output._debug).toBeUndefined();
    });

    it('should include _debug in error details when debug is true and request fails', async () => {
      mockedFetch.mockResolvedValue(createMockResponse({}, 500));

      const stepWith = {
        method: 'POST',
        path: '/api/bad-endpoint',
        debug: true,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.request',
        stepId: 'test_step',
        stepType: 'kibana.request',
        configuration: { name: 'test_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.error).toBeDefined();
      expect(result.error.details._debug).toBeDefined();
      expect(result.error.details._debug.kibanaUrl).toBe('https://localhost:5601');
    });

    it('should include fullUrl with query params in _debug output', async () => {
      const stepWith = {
        method: 'GET',
        path: '/api/cases',
        query: { page: '1', perPage: '10' },
        debug: true,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.request',
        stepId: 'test_step',
        stepType: 'kibana.request',
        configuration: { name: 'test_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.output._debug.fullUrl).toBe(
        'https://localhost:5601/api/cases?page=1&perPage=10'
      );
    });
  });

  describe('meta params not forwarded to HTTP request', () => {
    it('should not include use_server_info, use_localhost, or debug in request body', async () => {
      const stepWith = {
        title: 'Test Case',
        description: 'Test Description',
        owner: 'securitySolution',
        use_server_info: false,
        use_localhost: false,
        debug: true,
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;
      const requestBody = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};

      expect(requestBody.use_server_info).toBeUndefined();
      expect(requestBody.use_localhost).toBeUndefined();
      expect(requestBody.debug).toBeUndefined();
      expect(requestBody.title).toBe('Test Case');
    });
  });

  describe('combined fetcher options', () => {
    it('should handle multiple fetcher options together', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const stepWith = {
        title: 'Test',
        fetcher: {
          skip_ssl_verification: true,
          keep_alive: true,
          max_redirects: 5,
          follow_redirects: false,
        },
      };
      const step = {
        id: 'test_step',
        type: 'kibana.createCase',
        stepId: 'test_step',
        stepType: 'kibana.createCase',
        configuration: { name: 'test_step', type: 'kibana.createCase', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(stepWith);

      // Verify Agent was created with all options
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

      // Verify fetch options
      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;

      expect(fetchOptions.redirect).toBe('manual');
    });
  });

  describe('response size limit enforcement (Layer 1)', () => {
    it('should abort fetch mid-stream when body exceeds max-step-size', async () => {
      const largeBody = JSON.stringify({ data: 'x'.repeat(500) });
      const cancelFn = jest.fn();
      mockedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => {
            let consumed = false;
            return {
              read: async () => {
                if (consumed) return { done: true, value: undefined };
                consumed = true;
                return { done: false, value: new TextEncoder().encode(largeBody) };
              },
              releaseLock: () => {},
              cancel: cancelFn,
            };
          },
        },
      } as any);

      const stepWith = {
        request: { method: 'GET', path: '/api/status' },
      };
      const step = {
        id: 'size_limit_step',
        type: 'kibana.request',
        stepId: 'size_limit_step',
        stepType: 'kibana.request',
        configuration: {
          name: 'size_limit_step',
          type: 'kibana.request',
          'max-step-size': '100b',
          with: stepWith,
        },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.error).toBeDefined();
      expect(result.error.type).toBe('StepSizeLimitExceeded');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('should truncate large error response bodies', async () => {
      const largeErrorBody = 'E'.repeat(2 * 1024 * 1024); // 2MB error
      mockedFetch.mockResolvedValue({
        ok: false,
        status: 500,
        body: {
          getReader: () => {
            let consumed = false;
            return {
              read: async () => {
                if (consumed) return { done: true, value: undefined };
                consumed = true;
                return { done: false, value: new TextEncoder().encode(largeErrorBody) };
              },
              releaseLock: () => {},
              cancel: jest.fn(),
            };
          },
        },
      } as any);

      const stepWith = {
        request: { method: 'GET', path: '/api/broken' },
      };
      const step = {
        id: 'error_truncation_step',
        type: 'kibana.request',
        stepId: 'error_truncation_step',
        stepType: 'kibana.request',
        configuration: { name: 'error_truncation_step', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.error).toBeDefined();
      expect(result.error.message.length).toBeLessThan(1.5 * 1024 * 1024);
      expect(result.error.message).toContain('... [truncated]');
    });
  });

  describe('empty response body handling (204 No Content)', () => {
    it('should succeed with empty output when response is 204 No Content', async () => {
      mockedFetch.mockResolvedValue({
        ok: true,
        status: 204,
      } as any);

      const stepWith = {
        request: { method: 'DELETE', path: '/api/alerting/rule/some-rule-id' },
      };
      const step = {
        id: 'delete_rule',
        type: 'kibana.request',
        stepId: 'delete_rule',
        stepType: 'kibana.request',
        configuration: { name: 'delete_rule', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.error).toBeUndefined();
      expect(result.output).toEqual({});
    });

    it('should include _debug info for empty responses when debug is true', async () => {
      mockedFetch.mockResolvedValue({
        ok: true,
        status: 204,
      } as any);

      const stepWith = {
        request: {
          method: 'DELETE',
          path: '/api/alerting/rule/some-rule-id',
        },
        debug: true,
      };
      const step = {
        id: 'delete_rule',
        type: 'kibana.request',
        stepId: 'delete_rule',
        stepType: 'kibana.request',
        configuration: { name: 'delete_rule', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.error).toBeUndefined();
      expect(result.output._debug).toBeDefined();
      expect(result.output._debug.method).toBe('DELETE');
    });

    it('should still parse JSON normally when response body is non-empty', async () => {
      const jsonBody = JSON.stringify({ id: 'case-1', title: 'Test' });
      mockedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => {
            let consumed = false;
            return {
              read: async () => {
                if (consumed) return { done: true, value: undefined };
                consumed = true;
                return { done: false, value: new TextEncoder().encode(jsonBody) };
              },
              releaseLock: () => {},
              cancel: jest.fn(),
            };
          },
        },
      } as any);

      const stepWith = {
        request: {
          method: 'POST',
          path: '/api/cases',
          body: { title: 'Test' },
        },
      };
      const step = {
        id: 'create_case',
        type: 'kibana.request',
        stepId: 'create_case',
        stepType: 'kibana.request',
        configuration: { name: 'create_case', type: 'kibana.request', with: stepWith },
      } as unknown as KibanaGraphNode;

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (kibanaStep as any)._run(stepWith);

      expect(result.error).toBeUndefined();
      expect(result.output).toEqual({ id: 'case-1', title: 'Test' });
    });
  });
});
