/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import type { HttpGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { HttpStepImpl } from './http_step_impl';
import { UrlValidator } from '../../lib/url_validator';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the isAxiosError static method
jest.spyOn(axios, 'isAxiosError');

describe('HttpStepImpl', () => {
  let httpStep: HttpStepImpl;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockUrlValidator: UrlValidator;
  let mockStep: HttpGraphNode;

  let stepContextAbortController: AbortController;
  let mockContextManager: jest.Mocked<
    Pick<WorkflowContextManager, 'getContext' | 'renderValueAccordingToContext'>
  > & {
    abortController: AbortController;
  };

  beforeEach(() => {
    stepContextAbortController = new AbortController();
    mockContextManager = {
      getContext: jest.fn(),
      renderValueAccordingToContext: jest.fn(<T>(value: T): T => value),
      abortController: stepContextAbortController,
    } as any;
    mockContextManager.renderValueAccordingToContext.mockReturnValue({
      url: 'rendered({{baseUrl}}/users)',
      method: 'rendered(POST)',
      headers: { Authorization: 'rendered(Bearer {{authToken}})' },
      body: {
        id: 'rendered({{userId}})',
      },
    });

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
      flushEventLogs: jest.fn().mockResolvedValue(undefined),
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
          method: 'POST',
          headers: {
            Authorization: 'Bearer {{authToken}}',
          },
          body: {
            id: '{{userId}}',
          },
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

  afterEach(() => {
    (mockedAxios as unknown as jest.Mock).mockReset();
    (axios.isAxiosError as unknown as jest.Mock).mockReset();
  });

  describe('getInput', () => {
    it('should render http step context', () => {
      mockStep.configuration.with.url = '{{baseUrl}}/users';

      httpStep.getInput();

      expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith({
        url: '{{baseUrl}}/users',
        method: 'POST',
        headers: { Authorization: 'Bearer {{authToken}}' },
        body: {
          id: '{{userId}}',
        },
        fetcher: undefined,
      });
    });

    it('should return rendered inputs', () => {
      const inputs = httpStep.getInput();

      expect(inputs).toEqual({
        url: 'rendered({{baseUrl}}/users)',
        method: 'rendered(POST)',
        headers: { Authorization: 'rendered(Bearer {{authToken}})' },
        body: {
          id: 'rendered({{userId}})',
        },
      });
    });

    it('should use default method and timeout', () => {
      (mockStep.configuration.with as any).method = undefined;
      (mockStep.configuration.with as any).timeout = undefined;

      httpStep.getInput();

      expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw error when template rendering fails', () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      };
      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation(() => {
        throw new Error('Template rendering failed');
      });
      mockContextManager.getContext.mockReturnValue(context as any);
      // Use a filter that will throw an error (e.g., accessing undefined property)
      mockStep.configuration.with.url = '{{ nonexistent | upper }}';

      expect(() => httpStep.getInput()).toThrow(new Error('Template rendering failed'));
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

    it('should support body for all HTTP methods', async () => {
      const testBody = { data: 'test' };
      const methods: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'> = [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
      ];

      for (const method of methods) {
        (mockedAxios as any).mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {},
        });

        const input = {
          url: 'https://api.example.com/data',
          method,
          headers: { 'Content-Type': 'application/json' },
          body: testBody,
        };

        await (httpStep as any)._run(input);

        expect(mockedAxios).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'https://api.example.com/data',
            method,
            data: testBody,
          })
        );
      }
    });
  });

  describe('run', () => {
    beforeEach(() => {
      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue({
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
      });
    });

    it('should execute the full workflow step lifecycle', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true },
      };
      (mockedAxios as any).mockResolvedValueOnce(mockResponse);

      await httpStep.run();

      expect(mockStepExecutionRuntime.startStep).toHaveBeenCalledWith();
      expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
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
      (mockedAxios as any).isAxiosError.mockReturnValue(true);
      const input = {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
      };

      const result = await (httpStep as any)._run(input);

      expect((mockedAxios as any).isAxiosError).toHaveBeenCalledWith(axiosError);
      expect(result.error).toEqual(
        new ExecutionError({
          type: 'HttpRequestCancelledError',
          message: 'HTTP request was cancelled',
        })
      );
    });

    it('should fail the step and continue workflow when template rendering fails', async () => {
      const context = {
        execution: { id: 'test-run', isTestRun: false, startedAt: new Date() },
        workflow: { id: 'test-workflow', name: 'Test', enabled: true, spaceId: 'default' },
        steps: {},
      };
      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation(() => {
        throw new Error('Template rendering failed');
      });
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
        new ExecutionError({
          message: 'Template rendering failed',
          type: 'Error',
        })
      );

      // Should navigate to next node (workflow continues)
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();

      // Should NOT call finishStep
      expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
    });
  });

  describe('URL validation', () => {
    beforeEach(() => {
      mockContextManager.renderValueAccordingToContext = jest
        .fn()
        .mockImplementation(() => mockStep.configuration.with);
    });

    it('should allow requests to permitted hosts', async () => {
      mockStep.configuration.with = {
        ...mockStep.configuration.with,
        url: 'https://api.example.com/data',
        method: 'GET',
      };
      mockUrlValidator = new UrlValidator({ allowedHosts: ['api.example.com'] });
      httpStep = new HttpStepImpl(
        mockStep,
        mockStepExecutionRuntime,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

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
      mockStep.configuration.with = {
        url: 'https://malicious.com/test',
        method: 'GET',
        headers: {},
        timeout: '30s',
      };
      httpStep = new HttpStepImpl(
        mockStep,
        mockStepExecutionRuntime,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

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
        new ExecutionError({
          message:
            'target url "https://malicious.com/test" is not added to the Kibana config workflowsExecutionEngine.http.allowedHosts',
          type: 'Error',
        })
      );
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });

    it('should allow all hosts when wildcard is configured', async () => {
      mockStep.configuration.with = {
        url: 'https://any-host.com/test',
        method: 'GET',
        headers: {},
        timeout: '30s',
      };
      mockUrlValidator = new UrlValidator({ allowedHosts: ['*'] });
      httpStep = new HttpStepImpl(
        mockStep,
        mockStepExecutionRuntime,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

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

  describe('Fetcher configuration', () => {
    beforeEach(() => {
      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue({
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
      });
    });

    it('should apply skip_ssl_verification option', async () => {
      const input = {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'John Doe' },
        fetcher: {
          skip_ssl_verification: true,
        },
      };

      (mockedAxios as any).mockResolvedValueOnce({ status: 200, data: { success: true } });

      await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          httpsAgent: expect.objectContaining({
            options: expect.objectContaining({
              rejectUnauthorized: false,
            }),
          }),
        })
      );
    });

    it('should apply keep_alive option', async () => {
      const input = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        fetcher: {
          keep_alive: true,
        },
      };

      (mockedAxios as any).mockResolvedValueOnce({ status: 200, data: { success: true } });

      await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          httpsAgent: expect.objectContaining({
            options: expect.objectContaining({
              keepAlive: true,
            }),
          }),
        })
      );
    });

    it('should apply max_redirects option', async () => {
      const input = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        fetcher: {
          max_redirects: 5,
        },
      };

      (mockedAxios as any).mockResolvedValueOnce({ status: 200, data: { success: true } });

      await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRedirects: 5,
        })
      );
    });

    it('should disable redirects when follow_redirects is false', async () => {
      const input = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        fetcher: {
          follow_redirects: false,
        },
      };

      (mockedAxios as any).mockResolvedValueOnce({ status: 200, data: { success: true } });

      await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRedirects: 0,
        })
      );
    });

    it('should work without fetcher options', async () => {
      const input = {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
      };

      (mockedAxios as any).mockResolvedValueOnce({ status: 200, data: { success: true } });

      await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.not.objectContaining({
          httpsAgent: expect.anything(),
        })
      );
    });
  });
});
