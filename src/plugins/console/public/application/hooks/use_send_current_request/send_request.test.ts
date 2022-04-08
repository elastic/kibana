/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContextValue } from '../../contexts';

jest.mock('./send_request', () => ({ sendRequest: jest.fn(() => Promise.resolve()) }));

import { sendRequest } from './send_request';
import { serviceContextMock } from '../../contexts/services_context.mock';

const mockedSendRequest = sendRequest as jest.Mock;

describe('sendRequest', () => {
  let mockContextValue: ContextValue;

  beforeEach(() => {
    mockContextValue = serviceContextMock.create();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should send request', async () => {
    mockedSendRequest.mockResolvedValue([
      {
        response: {
          statusCode: 200,
          value: '{\n  "acknowledged": true \n}',
        },
      },
    ]);

    const args = {
      http: mockContextValue.services.http,
      requests: [{ method: 'PUT', url: 'test', data: [] }],
    };
    const results = await sendRequest(args);

    const [request] = results;
    expect(request.response.statusCode).toEqual(200);
    expect(request.response.value).toContain('"acknowledged": true');
    expect(mockedSendRequest).toHaveBeenCalledWith(args);
    expect(mockedSendRequest).toHaveBeenCalledTimes(1);
  });

  it('should send multiple requests', async () => {
    mockedSendRequest.mockResolvedValue([
      {
        response: {
          statusCode: 200,
        },
      },
      {
        response: {
          statusCode: 200,
        },
      },
    ]);

    const args = {
      http: mockContextValue.services.http,
      requests: [
        { method: 'GET', url: 'test-1', data: [] },
        { method: 'GET', url: 'test-2', data: [] },
      ],
    };
    const results = await sendRequest(args);

    const [firstRequest, secondRequest] = results;
    expect(firstRequest.response.statusCode).toEqual(200);
    expect(secondRequest.response.statusCode).toEqual(200);
    expect(mockedSendRequest).toHaveBeenCalledWith(args);
    expect(mockedSendRequest).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    mockedSendRequest.mockRejectedValue({
      response: {
        statusCode: 500,
        statusText: 'error',
      },
    });

    try {
      await sendRequest({
        http: mockContextValue.services.http,
        requests: [{ method: 'GET', url: 'test', data: [] }],
      });
    } catch (error) {
      expect(error.response.statusCode).toEqual(500);
      expect(error.response.statusText).toEqual('error');
      expect(mockedSendRequest).toHaveBeenCalledTimes(1);
    }
  });
});
