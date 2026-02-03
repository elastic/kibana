/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaActionStepImpl } from './kibana_action_step';
import type { KibanaActionStep } from './kibana_action_step';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Mock fetch globally
global.fetch = jest.fn();
const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

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
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    mockWorkflowLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
    } as any;

    // Mock successful fetch response
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
      text: jest.fn().mockResolvedValue('OK'),
    } as any);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('fetcher options extraction', () => {
    it('should extract fetcher options and not include them in request body', async () => {
      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test Case',
          description: 'Test Description',
          owner: 'securitySolution',
          fetcher: {
            skip_ssl_verification: true,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

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
      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.api',
        spaceId: 'default',
        with: {
          request: {
            method: 'POST',
            path: '/api/cases',
            body: { title: 'Test' },
          },
          fetcher: {
            skip_ssl_verification: true,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

      expect(mockedFetch).toHaveBeenCalled();

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;
      const requestBody = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};

      // Verify fetcher is NOT in the request body
      expect(requestBody.fetcher).toBeUndefined();
      expect(requestBody.title).toBe('Test');
    });

    it('should work without fetcher options', async () => {
      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test Case',
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

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

      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test',
          fetcher: {
            skip_ssl_verification: true,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

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

      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test',
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

      // Agent should not be created
      expect(MockedAgent).not.toHaveBeenCalled();
    });
  });

  describe('other fetcher options', () => {
    it('should pass keep_alive option to Agent', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test',
          fetcher: {
            keep_alive: true,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

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

      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test',
          fetcher: {
            follow_redirects: false,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

      const fetchCall = mockedFetch.mock.calls[0];
      const fetchOptions = fetchCall[1] as RequestInit;

      expect(fetchOptions.redirect).toBe('manual');
    });

    it('should pass max_redirects to Agent', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test',
          fetcher: {
            max_redirects: 10,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

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

      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test',
          fetcher: {
            connections: 100,
            pipelining: 10,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

      expect(MockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: 100,
          pipelining: 10,
        })
      );
    });
  });

  describe('combined fetcher options', () => {
    it('should handle multiple fetcher options together', async () => {
      const { Agent } = await import('undici');
      const MockedAgent = Agent as jest.MockedClass<typeof Agent>;
      MockedAgent.mockClear();

      const step: KibanaActionStep = {
        name: 'test_step',
        type: 'kibana.createCase',
        spaceId: 'default',
        with: {
          title: 'Test',
          fetcher: {
            skip_ssl_verification: true,
            keep_alive: true,
            max_redirects: 5,
            follow_redirects: false,
          },
        },
      };

      const kibanaStep = new KibanaActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (kibanaStep as any)._run(step.with);

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
});
