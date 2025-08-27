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
import type {
  WorkflowContextManager,
  WorkflowExecutionRuntimeManager,
} from '../../workflow_context_manager/workflow_context_manager';
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
      setStepResult: jest.fn(),
      goToNextStep: jest.fn(),
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
      configuration: {
        name: 'test-http-step',
        type: 'http',
        with: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {},
          timeout: 30000,
        },
      },
    };

    httpStep = new HttpStepImpl(
      mockStep,
      mockContextManager,
      mockWorkflowRuntime,
      mockWorkflowLogger,
      mockUrlValidator
    );

    jest.clearAllMocks();
  });

  describe('getInput', () => {
    it('should render URL with context', () => {
      const context = {
        spaceId: 'default',
        workflowRunId: 'test-run',
        steps: {},
        baseUrl: 'https://api.example.com',
      };
      mockContextManager.getContext.mockReturnValue(context);
      mockStep.configuration.with.url = '{{baseUrl}}/users';

      const input = httpStep.getInput();

      expect(input.url).toBe('https://api.example.com/users');
    });

    it('should render headers with context', () => {
      const context = {
        spaceId: 'default',
        workflowRunId: 'test-run',
        steps: {},
        authToken: 'bearer-token-123',
      };
      mockContextManager.getContext.mockReturnValue(context);
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
        spaceId: 'default',
        workflowRunId: 'test-run',
        steps: {},
        userId: 123,
        name: 'John Doe',
      };
      mockContextManager.getContext.mockReturnValue(context);
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
      const context = { spaceId: 'default', workflowRunId: 'test-run', steps: {} };
      mockContextManager.getContext.mockReturnValue(context);
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

      const result = await (httpStep as any).executeHttpRequest(input);

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

      const result = await (httpStep as any).executeHttpRequest(input);

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
      const context = { spaceId: 'default', workflowRunId: 'test-run', steps: {} };
      mockContextManager.getContext.mockReturnValue(context);

      await httpStep.run();

      expect(mockWorkflowRuntime.startStep).toHaveBeenCalledWith('test-http-step');
      expect(mockWorkflowRuntime.setStepResult).toHaveBeenCalled();
      expect(mockWorkflowRuntime.finishStep).toHaveBeenCalledWith('test-http-step');
      expect(mockWorkflowRuntime.goToNextStep).toHaveBeenCalled();
    });
  });

  describe('URL validation', () => {
    it('should allow requests to permitted hosts', async () => {
      mockUrlValidator = new UrlValidator({ allowedHosts: ['api.example.com'] });
      httpStep = new HttpStepImpl(
        mockStep,
        mockContextManager,
        mockWorkflowRuntime,
        mockWorkflowLogger,
        mockUrlValidator
      );

      mockContextManager.getContext.mockReturnValue({
        spaceId: 'default',
        workflowRunId: 'test-run',
        steps: {},
      });

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
              timeout: 30000,
            },
          },
        },
        mockContextManager,
        mockWorkflowRuntime,
        mockWorkflowLogger,
        mockUrlValidator
      );

      mockContextManager.getContext.mockReturnValue({
        spaceId: 'default',
        workflowRunId: 'test-run',
        steps: {},
      });

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

      // Should still complete the workflow step lifecycle
      expect(mockWorkflowRuntime.startStep).toHaveBeenCalled();
      expect(mockWorkflowRuntime.setStepResult).toHaveBeenCalled();
      expect(mockWorkflowRuntime.finishStep).toHaveBeenCalled();
      expect(mockWorkflowRuntime.goToNextStep).toHaveBeenCalled();
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
              timeout: 30000,
            },
          },
        },
        mockContextManager,
        mockWorkflowRuntime,
        mockWorkflowLogger,
        mockUrlValidator
      );

      mockContextManager.getContext.mockReturnValue({
        spaceId: 'default',
        workflowRunId: 'test-run',
        steps: {},
      });

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
