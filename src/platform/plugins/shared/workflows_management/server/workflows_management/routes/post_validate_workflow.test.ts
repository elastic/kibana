/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { IRouter } from '@kbn/core-http-server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { registerPostValidateWorkflowRoute } from './post_validate_workflow';
import type { ValidateWorkflowResponse, WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check', () => ({
  withLicenseCheck: (handler: Function) => handler,
}));

describe('POST /api/workflows/_validate', () => {
  let router: jest.Mocked<IRouter>;
  let mockApi: jest.Mocked<WorkflowsManagementApi>;
  let mockSpaces: jest.Mocked<SpacesServiceStart>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockApi = {
      validateWorkflow: jest.fn(),
    } as any;
    mockSpaces = {
      getSpaceId: jest.fn().mockReturnValue('default'),
    } as any;
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    registerPostValidateWorkflowRoute({
      router,
      api: mockApi,
      spaces: mockSpaces,
      logger: mockLogger,
    });
  });

  it('should register a POST route at /api/workflows/_validate', () => {
    expect(router.post).toHaveBeenCalledTimes(1);
    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/api/workflows/_validate');
  });

  it('should return validation result on success', async () => {
    const validationResult: ValidateWorkflowResponse = {
      valid: true,
      diagnostics: [],
    };
    mockApi.validateWorkflow.mockResolvedValue(validationResult);

    const [, handler] = router.post.mock.calls[0];
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { yaml: 'name: Test' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await handler({} as any, mockRequest, mockResponse);

    expect(mockApi.validateWorkflow).toHaveBeenCalledWith('name: Test', 'default', mockRequest);
    expect(mockResponse.ok).toHaveBeenCalledWith({ body: validationResult });
  });

  it('should return diagnostics when validation fails', async () => {
    const validationResult: ValidateWorkflowResponse = {
      valid: false,
      diagnostics: [
        {
          severity: 'error',
          message: 'Required',
          source: 'schema',
          path: ['name'],
        },
      ],
    };
    mockApi.validateWorkflow.mockResolvedValue(validationResult);

    const [, handler] = router.post.mock.calls[0];
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { yaml: 'steps: []' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await handler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: validationResult });
  });

  it('should return 500 on internal error', async () => {
    mockApi.validateWorkflow.mockRejectedValue(new Error('Service unavailable'));

    const [, handler] = router.post.mock.calls[0];
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { yaml: 'name: Test' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await handler({} as any, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: expect.stringContaining('Service unavailable'),
      },
    });
  });
});
