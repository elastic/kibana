/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpGraphNode } from '@kbn/workflows/graph';
import axios from 'axios';
import { UrlValidator } from '../../lib/url_validator';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import { HttpStepImpl } from './http_step_impl';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpStepImpl', () => {
  let httpStep: HttpStepImpl;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockUrlValidator: UrlValidator;
  let mockStep: HttpGraphNode;

  let stepContextAbortController: AbortController;
  let mockContextManager: jest.Mocked<Pick<WorkflowContextManager, 'getContext'>> & {
    abortController: AbortController;
  };

  beforeEach(() => {
    stepContextAbortController = new AbortController();
    mockContextManager = {
      getContext: jest.fn(),
      abortController: stepContextAbortController,
    };

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      finishStep: jest.fn().mockResolvedValue(undefined),
      failStep: jest.fn().mockResolvedValue(undefined),
      setInput: jest.fn().mockResolvedValue(undefined),
      getCurrentStepState: jest.fn(),
      setCurrentStepState: jest.fn().mockResolvedValue(undefined),
      stepExecutionId: 'test-step-exec-id',
      abortController: stepContextAbortController,
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    mockWorkflowLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
    } as any;

    mockUrlValidator = new UrlValidator({ allowedHosts: ['*'] });

    mockStep = {
      id: 'test-http-step',
      type: 'http',
      stepId: 'test-http-step',
      stepType: 'http',
      configuration: {
        name: 'test-http-step',
        type: 'http',
        with: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {},
          timeout: '30s',
        },
      },
    };

    httpStep = new HttpStepImpl(
      mockStep,
      mockStepExecutionRuntime,
      mockWorkflowLogger,
      mockUrlValidator,
      mockWorkflowRuntime
    );

    jest.clearAllMocks();
  });

  afterEach(() => (mockedAxios as unknown as jest.Mock).mockReset());

  describe('getInput', () => {
    it('should render URL with context', () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
        baseUrl: 'https://api.example.com',
      };
      mockContextManager.getContext.mockReturnValue(context as any);
      mockStep.configuration.with.url = '{{baseUrl}}/users';

      const input = httpStep.getInput();

      expect(input.url).toBe('https://api.example.com/users');
    });

    it('should render headers with context', () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
        authToken: 'bearer-token-123',
      };
      mockContextManager.getContext.mockReturnValue(context as any);
      mockStep.configuration.with.headers = {
        Authorization: 'Bearer {{authToken}}',
        'Content-Type': 'application/json',
      };

      const input = httpStep.getInput();

      expect(input.headers).toEqual({
        Authorization: 'Bearer bearer-token-123',
        'Content-Type': 'application/json',
      });
    });

    it('should render body with context', () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
        userId: 123,
        name: 'John Doe',
      };
      mockContextManager.getContext.mockReturnValue(context as any);
      mockStep.configuration.with.body = {
        id: '{{userId}}',
        name: '{{name}}',
        active: true,
      };

      const input = httpStep.getInput();

      expect(input.body).toEqual({
        id: '123',
        name: 'John Doe',
        active: true,
      });
    });

    it('should use default method and timeout', () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      };
      mockContextManager.getContext.mockReturnValue(context as any);
      (mockStep.configuration.with as any).method = undefined;
      (mockStep.configuration.with as any).timeout = undefined;

      const input = httpStep.getInput();

      expect(input.method).toBe('GET');
    });

    it('should throw error when template rendering fails in URL', () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      };
      mockContextManager.getContext.mockReturnValue(context as any);
      // Use a filter that will throw an error (e.g., accessing undefined property)
      mockStep.configuration.with.url = '{{ nonexistent | upper }}';

      expect(() => httpStep.getInput()).toThrow();
    });

    it('should throw error when template rendering fails in headers', () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      };
      mockContextManager.getContext.mockReturnValue(context as any);
      mockStep.configuration.with.headers = {
        Authorization: '{{ invalidFilter | nonExistentFilter }}',
      };

      expect(() => httpStep.getInput()).toThrow();
    });
  });

  describe('executeHttpRequest', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { success: true },
      };
      (mockedAxios as any).mockResolvedValueOnce(mockResponse);

      const input = {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {},
        timeout: 30000,
      };

      const result = await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {},
        })
      );

      expect(result).toEqual({
        input,
        output: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { success: true },
        },
        error: undefined,
      });
    });

    it('should make successful with abort controller from step context', async () => {
      (mockedAxios as any).mockResolvedValueOnce({});

      const input = {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {},
        timeout: 30000,
      };

      await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: stepContextAbortController.signal,
        })
      );
    });

    it('should make successful POST request with body', async () => {
      const mockResponse = {
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 123 },
      };
      (mockedAxios as any).mockResolvedValueOnce(mockResponse);

      const input = {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
      };

      const result = await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/users',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: { name: 'John Doe' },
        })
      );

      expect(result.output?.status).toBe(201);
      expect(result.output?.data).toEqual({ id: 123 });
    });

    it('should make successful POST request abort signal from step context', async () => {
      (mockedAxios as any).mockResolvedValueOnce({});

      const input = {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
        timeout: 30000,
      };

      await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: stepContextAbortController.signal,
        })
      );
    });
  });

  describe('run', () => {
    it('should execute the full workflow step lifecycle', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true },
      };
      (mockedAxios as any).mockResolvedValueOnce(mockResponse);
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      };
      mockContextManager.getContext.mockReturnValue(context as any);

      await httpStep.run();

      expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {},
        body: undefined,
      });
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true },
      });
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });

    it('should return error about cancelled request if aborted', async () => {
      const axiosError = {
        code: 'ERR_CANCELED',
        message: 'Some error',
      };

      (mockedAxios as unknown as jest.Mock).mockRejectedValueOnce(axiosError);
      (mockedAxios as any).isAxiosError = jest.fn().mockReturnValue(true);
      const input = {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
      };

      const result = await (httpStep as any)._run(input);

      expect((mockedAxios as any).isAxiosError).toHaveBeenCalledWith(axiosError);
      expect(result.error).toBe('HTTP request was cancelled');
    });

    it('should fail the step and continue workflow when template rendering fails', async () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      };
      mockContextManager.getContext.mockReturnValue(context as any);
      // Use a filter that will throw an error (strictFilters: true in templating engine)
      mockStep.configuration.with.url = '{{ invalidVariable | nonExistentFilter }}';

      await httpStep.run();

      // Should not make HTTP request
      expect(mockedAxios).not.toHaveBeenCalled();

      // should start the step once
      expect(mockStepExecutionRuntime.startStep).toHaveBeenCalled();

      // Should start the step with undefined input
      expect(mockStepExecutionRuntime.setInput).not.toHaveBeenCalled();

      // Should fail the step with a clear error message
      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalledWith(
        expect.stringContaining('nonExistentFilter')
      );

      // Should navigate to next node (workflow continues)
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();

      // Should NOT call finishStep
      expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
    });
  });

  describe('URL validation', () => {
    it('should allow requests to permitted hosts', async () => {
      mockUrlValidator = new UrlValidator({ allowedHosts: ['api.example.com'] });
      httpStep = new HttpStepImpl(
        mockStep,
        mockStepExecutionRuntime,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

      mockContextManager.getContext.mockReturnValue({
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      } as any);

      (mockedAxios as any).mockResolvedValueOnce({ data: { success: true }, status: 200 });

      await httpStep.run();

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/data',
          method: 'GET',
        })
      );
    });

    it('should block requests to non-permitted hosts', async () => {
      mockUrlValidator = new UrlValidator({ allowedHosts: ['api.example.com'] });
      httpStep = new HttpStepImpl(
        {
          ...mockStep,
          configuration: {
            ...mockStep.configuration,
            with: {
              url: 'https://malicious.com/test',
              method: 'GET',
              headers: {},
              timeout: '30s',
            },
          },
        },
        mockStepExecutionRuntime,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

      mockContextManager.getContext.mockReturnValue({
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      } as any);

      await httpStep.run();

      // Should not make any HTTP request
      expect(mockedAxios).not.toHaveBeenCalled();

      // Should log the security error
      expect(mockWorkflowLogger.logError).toHaveBeenCalledWith(
        expect.stringContaining('HTTP request blocked'),
        expect.any(Error),
        expect.objectContaining({
          tags: ['http', 'security', 'blocked'],
        })
      );

      // Should start the step, fail the step, and navigate to next node
      expect(mockStepExecutionRuntime.startStep).toHaveBeenCalled();
      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalledWith(
        'target url "https://malicious.com/test" is not added to the Kibana config workflowsExecutionEngine.http.allowedHosts'
      );
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });

    it('should allow all hosts when wildcard is configured', async () => {
      mockUrlValidator = new UrlValidator({ allowedHosts: ['*'] });
      httpStep = new HttpStepImpl(
        {
          ...mockStep,
          configuration: {
            ...mockStep.configuration,
            with: {
              url: 'https://any-host.com/test',
              method: 'GET',
              headers: {},
              timeout: '30s',
            },
          },
        },
        mockStepExecutionRuntime,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

      mockContextManager.getContext.mockReturnValue({
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      } as any);

      (mockedAxios as any).mockResolvedValueOnce({ data: { success: true }, status: 200 });

      await httpStep.run();

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://any-host.com/test',
          method: 'GET',
        })
      );
    });
  });
});
