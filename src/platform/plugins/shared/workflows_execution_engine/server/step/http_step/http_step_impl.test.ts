/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpGraphNode } from '@kbn/workflows';
import axios from 'axios';
import { UrlValidator } from '../../lib/url_validator';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import { HttpStepImpl } from './http_step_impl';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpStepImpl', () => {
  let httpStep: HttpStepImpl;
  let mockContextManager: jest.Mocked<WorkflowContextManager>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockUrlValidator: UrlValidator;
  let mockStep: HttpGraphNode;

  beforeEach(() => {
    mockContextManager = {
      getContext: jest.fn(),
    } as any;

    mockWorkflowRuntime = {
      startStep: jest.fn(),
      finishStep: jest.fn(),
      setCurrentStepResult: jest.fn(),
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
      mockContextManager,
      mockWorkflowLogger,
      mockUrlValidator,
      mockWorkflowRuntime
    );

    jest.clearAllMocks();
  });

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
      expect(input.timeout).toBe(30000);
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

      expect(mockedAxios).toHaveBeenCalledWith({
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {},
        timeout: 30000,
      });

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
        timeout: 30000,
      };

      const result = await (httpStep as any)._run(input);

      expect(mockedAxios).toHaveBeenCalledWith({
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { name: 'John Doe' },
        timeout: 30000,
      });

      expect(result.output?.status).toBe(201);
      expect(result.output?.data).toEqual({ id: 123 });
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

      expect(mockWorkflowRuntime.startStep).toHaveBeenCalledWith();
      expect(mockWorkflowRuntime.setCurrentStepResult).toHaveBeenCalled();
      expect(mockWorkflowRuntime.finishStep).toHaveBeenCalledWith();
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('URL validation', () => {
    it('should allow requests to permitted hosts', async () => {
      mockUrlValidator = new UrlValidator({ allowedHosts: ['api.example.com'] });
      httpStep = new HttpStepImpl(
        mockStep,
        mockContextManager,
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
        mockContextManager,
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

      // Should start the step, set the error result, finish the step, but not go to next step
      expect(mockWorkflowRuntime.startStep).toHaveBeenCalled();
      expect(mockWorkflowRuntime.setCurrentStepResult).toHaveBeenCalledWith({
        input: {
          url: 'https://malicious.com/test',
          method: 'GET',
          headers: {},
          body: undefined,
          timeout: 30000,
        },
        output: undefined,
        error:
          'target url "https://malicious.com/test" is not added to the Kibana config workflowsExecutionEngine.http.allowedHosts',
      });
      expect(mockWorkflowRuntime.finishStep).toHaveBeenCalled();
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
        mockContextManager,
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

  describe('timeout duration parsing', () => {
    it('should parse timeout duration strings correctly', () => {
      const testCases = [
        { input: '1s', expected: 1000 },
        { input: '30s', expected: 30000 },
        { input: '1m', expected: 60000 },
        { input: '5m', expected: 300000 },
        { input: '1h', expected: 3600000 },
        { input: '2h30m', expected: 9000000 },
        { input: '1000ms', expected: 1000 },
      ];

      testCases.forEach(({ input, expected }) => {
        mockStep.configuration.with.timeout = input;
        const httpStepInstance = new HttpStepImpl(
          mockStep,
          mockContextManager,
          mockWorkflowLogger,
          mockUrlValidator,
          mockWorkflowRuntime
        );

        const result = httpStepInstance.getInput();
        expect(result.timeout).toBe(expected);
      });
    });

    it('should handle default timeout when not specified', () => {
      const stepWithoutTimeout = {
        ...mockStep,
        configuration: {
          ...mockStep.configuration,
          with: {
            ...mockStep.configuration.with,
          },
        },
      };
      delete (stepWithoutTimeout.configuration.with as any).timeout;

      const httpStepInstance = new HttpStepImpl(
        stepWithoutTimeout,
        mockContextManager,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

      const result = httpStepInstance.getInput();
      expect(result.timeout).toBe(30000); // 30s default
    });

    it('should throw error for invalid duration format', () => {
      mockStep.configuration.with.timeout = 'invalid';
      const httpStepInstance = new HttpStepImpl(
        mockStep,
        mockContextManager,
        mockWorkflowLogger,
        mockUrlValidator,
        mockWorkflowRuntime
      );

      expect(() => httpStepInstance.getInput()).toThrow(/Invalid duration format/);
    });
  });
});
