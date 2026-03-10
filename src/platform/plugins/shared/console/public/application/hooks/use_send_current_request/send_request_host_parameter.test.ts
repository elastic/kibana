/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { RequestArgs } from './send_request';
import { sendRequest } from './send_request';
import { send } from '../../../lib/es/es';

jest.mock('../../../lib/es/es');

const mockSend = send as jest.MockedFunction<typeof send>;

describe('sendRequest host parameter', () => {
  let mockHttp: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    mockHttp = {} as jest.Mocked<HttpSetup>;
    jest.clearAllMocks();

    mockSend.mockResolvedValue({
      response: {
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      },
      body: '{"acknowledged": true}',
    } as any);
  });

  it('should pass host parameter to send function when provided', async () => {
    const testHost = 'http://custom-es-host:9200';
    const args: RequestArgs = {
      http: mockHttp,
      requests: [
        {
          url: '/_cat/indices',
          method: 'GET',
          data: [''],
        },
      ],
      host: testHost,
    };

    await sendRequest(args);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        http: mockHttp,
        method: 'GET',
        path: '/_cat/indices',
        data: '',
        asResponse: true,
        host: testHost,
      })
    );
  });

  it('should not pass host parameter to send function when not provided', async () => {
    const args: RequestArgs = {
      http: mockHttp,
      requests: [
        {
          url: '/_cat/indices',
          method: 'GET',
          data: [''],
        },
      ],
    };

    await sendRequest(args);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        http: mockHttp,
        method: 'GET',
        path: '/_cat/indices',
        data: '',
        asResponse: true,
        host: undefined,
      })
    );
  });

  it('should pass host parameter for multiple requests', async () => {
    const testHost = 'http://custom-es-host:9200';
    const args: RequestArgs = {
      http: mockHttp,
      requests: [
        {
          url: '/_cat/indices',
          method: 'GET',
          data: [''],
        },
        {
          url: '/_cluster/health',
          method: 'GET',
          data: [''],
        },
      ],
      host: testHost,
    };

    await sendRequest(args);

    expect(mockSend).toHaveBeenCalledTimes(2);

    // Check first request
    expect(mockSend).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: '/_cat/indices',
        host: testHost,
      })
    );

    // Check second request
    expect(mockSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: '/_cluster/health',
        host: testHost,
      })
    );
  });
});
