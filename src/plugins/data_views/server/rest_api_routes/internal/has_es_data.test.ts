/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import { IKibanaResponse, Logger, RequestHandlerContext } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { createHandler, crossClusterPatterns, patterns } from './has_es_data';
import { loggerMock } from '@kbn/logging-mocks';

const mockEsDataTimeout = 5000;

describe('has_es_data route', () => {
  let mockLogger: MockedKeys<Logger>;

  beforeEach(() => {
    mockLogger = loggerMock.create();
  });

  it('should return hasEsData: true if there are matching local indices', async () => {
    const mockESClient = {
      indices: {
        resolveCluster: jest.fn().mockResolvedValue({
          local: { matching_indices: true },
        }),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
      },
    } as unknown as RequestHandlerContext;
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(mockResponse, 'ok')
      .mockImplementation((params) => params as unknown as IKibanaResponse);
    const handler = createHandler(mockLogger, mockEsDataTimeout);
    const response = await handler(mockContext, mockRequest, mockResponse);
    expect(mockESClient.indices.resolveCluster).toBeCalledTimes(1);
    expect(mockESClient.indices.resolveCluster).toBeCalledWith(
      {
        name: patterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockResponse.ok).toBeCalledTimes(1);
    expect(mockResponse.ok).toBeCalledWith({ body: { hasEsData: true } });
    expect(response).toEqual({ body: { hasEsData: true } });
  });

  it('should return hasEsData: true if there are no matching local indices but matching remote indices', async () => {
    const mockESClient = {
      indices: {
        resolveCluster: jest
          .fn()
          .mockImplementation(({ name }) =>
            name === patterns
              ? { local: { matching_indices: false } }
              : name === crossClusterPatterns
              ? { remote: { matching_indices: true } }
              : {}
          ),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
      },
    } as unknown as RequestHandlerContext;
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(mockResponse, 'ok')
      .mockImplementation((params) => params as unknown as IKibanaResponse);
    const handler = createHandler(mockLogger, mockEsDataTimeout);
    const response = await handler(mockContext, mockRequest, mockResponse);
    expect(mockESClient.indices.resolveCluster).toBeCalledTimes(2);
    expect(mockESClient.indices.resolveCluster).toHaveBeenNthCalledWith(
      1,
      {
        name: patterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockESClient.indices.resolveCluster).toHaveBeenNthCalledWith(
      2,
      {
        name: crossClusterPatterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockResponse.ok).toBeCalledTimes(1);
    expect(mockResponse.ok).toBeCalledWith({ body: { hasEsData: true } });
    expect(response).toEqual({ body: { hasEsData: true } });
  });

  it('should return hasEsData: false if there are no matching local or remote indices', async () => {
    const mockESClient = {
      indices: {
        resolveCluster: jest.fn().mockResolvedValue({
          local: { matching_indices: false },
          remote: { matching_indices: false },
        }),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
      },
    } as unknown as RequestHandlerContext;
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(mockResponse, 'ok')
      .mockImplementation((params) => params as unknown as IKibanaResponse);
    const handler = createHandler(mockLogger, mockEsDataTimeout);
    const response = await handler(mockContext, mockRequest, mockResponse);
    expect(mockESClient.indices.resolveCluster).toBeCalledTimes(2);
    expect(mockESClient.indices.resolveCluster).toHaveBeenNthCalledWith(
      1,
      {
        name: patterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockESClient.indices.resolveCluster).toHaveBeenNthCalledWith(
      2,
      {
        name: crossClusterPatterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockResponse.ok).toBeCalledTimes(1);
    expect(mockResponse.ok).toBeCalledWith({ body: { hasEsData: false } });
    expect(response).toEqual({ body: { hasEsData: false } });
  });

  it('should return a 504 response and log a warning if the local data request times out', async () => {
    const mockESClient = {
      indices: {
        resolveCluster: jest.fn().mockRejectedValue({ name: 'TimeoutError' }),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
      },
    } as unknown as RequestHandlerContext;
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(mockResponse, 'customError')
      .mockImplementation((params) => params as unknown as IKibanaResponse);
    const handler = createHandler(mockLogger, mockEsDataTimeout);
    const response = await handler(mockContext, mockRequest, mockResponse);
    expect(mockESClient.indices.resolveCluster).toBeCalledTimes(1);
    expect(mockESClient.indices.resolveCluster).toBeCalledWith(
      {
        name: patterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockResponse.customError).toBeCalledTimes(1);
    expect(mockResponse.customError).toBeCalledWith({
      statusCode: 504,
      body: {
        message: 'Timeout while checking for Elasticsearch data',
        attributes: { failureReason: 'local_data_timeout' },
      },
    });
    expect(response).toEqual({
      statusCode: 504,
      body: {
        message: 'Timeout while checking for Elasticsearch data',
        attributes: { failureReason: 'local_data_timeout' },
      },
    });
    expect(mockLogger.warn).toBeCalledTimes(1);
    expect(mockLogger.warn).toBeCalledWith(
      'Timeout while checking for Elasticsearch data: local_data_timeout. Current timeout value is 5000ms. ' +
        'Use "data_views.hasEsDataTimeout" in kibana.yml to change it, or set to 0 to disable timeouts.'
    );
  });

  it('should return a 504 response and log a warning if the remote data request times out', async () => {
    const mockESClient = {
      indices: {
        resolveCluster: jest.fn().mockImplementation(({ name }) => {
          if (name === patterns) {
            return { local: { matching_indices: false } };
          }

          if (name === crossClusterPatterns) {
            // eslint-disable-next-line no-throw-literal
            throw { name: 'TimeoutError' };
          }

          return {};
        }),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
      },
    } as unknown as RequestHandlerContext;
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(mockResponse, 'customError')
      .mockImplementation((params) => params as unknown as IKibanaResponse);
    const handler = createHandler(mockLogger, mockEsDataTimeout);
    const response = await handler(mockContext, mockRequest, mockResponse);
    expect(mockESClient.indices.resolveCluster).toBeCalledTimes(2);
    expect(mockESClient.indices.resolveCluster).toHaveBeenNthCalledWith(
      1,
      {
        name: patterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockESClient.indices.resolveCluster).toHaveBeenNthCalledWith(
      2,
      {
        name: crossClusterPatterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockResponse.customError).toBeCalledTimes(1);
    expect(mockResponse.customError).toBeCalledWith({
      statusCode: 504,
      body: {
        message: 'Timeout while checking for Elasticsearch data',
        attributes: { failureReason: 'remote_data_timeout' },
      },
    });
    expect(response).toEqual({
      statusCode: 504,
      body: {
        message: 'Timeout while checking for Elasticsearch data',
        attributes: { failureReason: 'remote_data_timeout' },
      },
    });
    expect(mockLogger.warn).toBeCalledTimes(1);
    expect(mockLogger.warn).toBeCalledWith(
      'Timeout while checking for Elasticsearch data: remote_data_timeout. Current timeout value is 5000ms. ' +
        'Use "data_views.hasEsDataTimeout" in kibana.yml to change it, or set to 0 to disable timeouts.'
    );
  });

  it('should return a 500 response and log an error if the request fails for an unknown reason', async () => {
    const someError = new Error('Some error');
    const mockESClient = {
      indices: {
        resolveCluster: jest.fn().mockRejectedValue(someError),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
      },
    } as unknown as RequestHandlerContext;
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(mockResponse, 'customError')
      .mockImplementation((params) => params as unknown as IKibanaResponse);
    const handler = createHandler(mockLogger, mockEsDataTimeout);
    const response = await handler(mockContext, mockRequest, mockResponse);
    expect(mockESClient.indices.resolveCluster).toBeCalledTimes(1);
    expect(mockESClient.indices.resolveCluster).toBeCalledWith(
      {
        name: patterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: mockEsDataTimeout }
    );
    expect(mockResponse.customError).toBeCalledTimes(1);
    expect(mockResponse.customError).toBeCalledWith({
      statusCode: 500,
      body: {
        message: 'Error while checking for Elasticsearch data',
        attributes: { failureReason: 'unknown' },
      },
    });
    expect(response).toEqual({
      statusCode: 500,
      body: {
        message: 'Error while checking for Elasticsearch data',
        attributes: { failureReason: 'unknown' },
      },
    });
    expect(mockLogger.error).toBeCalledTimes(1);
    expect(mockLogger.error).toBeCalledWith(someError);
  });
});
