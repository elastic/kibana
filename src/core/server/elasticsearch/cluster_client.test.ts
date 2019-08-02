/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ElasticsearchConfig } from './elasticsearch_config';

import {
  MockClient,
  mockParseElasticsearchClientConfig,
  MockScopedClusterClient,
} from './cluster_client.test.mocks';

import { errors } from 'elasticsearch';
import { get } from 'lodash';
import { Logger } from '../logging';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { httpServerMock } from '../http/http_server.mocks';
import { ClusterClient } from './cluster_client';

const logger = loggingServiceMock.create();
afterEach(() => jest.clearAllMocks());

test('#constructor creates client with parsed config', () => {
  const mockEsClientConfig = { apiVersion: 'es-client-master' };
  mockParseElasticsearchClientConfig.mockReturnValue(mockEsClientConfig);

  const mockEsConfig = { apiVersion: 'es-version' } as any;
  const mockLogger = logger.get();

  const clusterClient = new ClusterClient(mockEsConfig, mockLogger);
  expect(clusterClient).toBeDefined();

  expect(mockParseElasticsearchClientConfig).toHaveBeenCalledTimes(1);
  expect(mockParseElasticsearchClientConfig).toHaveBeenLastCalledWith(mockEsConfig, mockLogger);

  expect(MockClient).toHaveBeenCalledTimes(1);
  expect(MockClient).toHaveBeenCalledWith(mockEsClientConfig);
});

describe('#callAsInternalUser', () => {
  let mockEsClientInstance: {
    close: jest.Mock;
    ping: jest.Mock;
    security: { authenticate: jest.Mock };
  };
  let clusterClient: ClusterClient;

  beforeEach(() => {
    mockEsClientInstance = {
      close: jest.fn(),
      ping: jest.fn(),
      security: { authenticate: jest.fn() },
    };
    MockClient.mockImplementation(() => mockEsClientInstance);

    clusterClient = new ClusterClient({ apiVersion: 'es-version' } as any, logger.get());
  });

  test('fails if cluster client is closed', async () => {
    clusterClient.close();

    await expect(
      clusterClient.callAsInternalUser('ping', {})
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Cluster client cannot be used after it has been closed."`
    );
  });

  test('fails if endpoint is invalid', async () => {
    await expect(
      clusterClient.callAsInternalUser('pong', {})
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"called with an invalid endpoint: pong"`);
  });

  test('correctly deals with top level endpoint', async () => {
    const mockResponse = { data: 'ping' };
    const mockParams = { param: 'ping' };
    mockEsClientInstance.ping.mockImplementation(function mockCall(this: any) {
      return Promise.resolve({
        context: this,
        response: mockResponse,
      });
    });

    const mockResult = await clusterClient.callAsInternalUser('ping', mockParams);
    expect(mockResult.response).toBe(mockResponse);
    expect(mockResult.context).toBe(mockEsClientInstance);
    expect(mockEsClientInstance.ping).toHaveBeenCalledTimes(1);
    expect(mockEsClientInstance.ping).toHaveBeenLastCalledWith(mockParams);
  });

  test('correctly deals with nested endpoint', async () => {
    const mockResponse = { data: 'authenticate' };
    const mockParams = { param: 'authenticate' };
    mockEsClientInstance.security.authenticate.mockImplementation(function mockCall(this: any) {
      return Promise.resolve({
        context: this,
        response: mockResponse,
      });
    });

    const mockResult = await clusterClient.callAsInternalUser('security.authenticate', mockParams);
    expect(mockResult.response).toBe(mockResponse);
    expect(mockResult.context).toBe(mockEsClientInstance.security);
    expect(mockEsClientInstance.security.authenticate).toHaveBeenCalledTimes(1);
    expect(mockEsClientInstance.security.authenticate).toHaveBeenLastCalledWith(mockParams);
  });

  test('does not wrap errors if `wrap401Errors` is not set', async () => {
    const mockError = { message: 'some error' };
    mockEsClientInstance.ping.mockRejectedValue(mockError);

    await expect(
      clusterClient.callAsInternalUser('ping', undefined, { wrap401Errors: false })
    ).rejects.toBe(mockError);

    const mockAuthenticationError = { message: 'authentication error', statusCode: 401 };
    mockEsClientInstance.ping.mockRejectedValue(mockAuthenticationError);

    await expect(
      clusterClient.callAsInternalUser('ping', undefined, { wrap401Errors: false })
    ).rejects.toBe(mockAuthenticationError);
  });

  test('wraps only 401 errors by default or when `wrap401Errors` is set', async () => {
    const mockError = { message: 'some error' };
    mockEsClientInstance.ping.mockRejectedValue(mockError);

    await expect(clusterClient.callAsInternalUser('ping')).rejects.toBe(mockError);
    await expect(
      clusterClient.callAsInternalUser('ping', undefined, { wrap401Errors: true })
    ).rejects.toBe(mockError);

    const mockAuthorizationError = { message: 'authentication error', statusCode: 403 };
    mockEsClientInstance.ping.mockRejectedValue(mockAuthorizationError);

    await expect(clusterClient.callAsInternalUser('ping')).rejects.toBe(mockAuthorizationError);
    await expect(
      clusterClient.callAsInternalUser('ping', undefined, { wrap401Errors: true })
    ).rejects.toBe(mockAuthorizationError);

    const mockAuthenticationError = new (errors.AuthenticationException as any)(
      'Authentication Exception',
      { statusCode: 401 }
    );
    mockEsClientInstance.ping.mockRejectedValue(mockAuthenticationError);

    await expect(clusterClient.callAsInternalUser('ping')).rejects.toBe(mockAuthenticationError);
    await expect(
      clusterClient.callAsInternalUser('ping', undefined, { wrap401Errors: true })
    ).rejects.toStrictEqual(mockAuthenticationError);
  });

  test('aborts the request and rejects if a signal is provided and aborted', async () => {
    const controller = new AbortController();

    // The ES client returns a promise with an additional `abort` method to abort the request
    const mockValue: any = Promise.resolve();
    mockValue.abort = jest.fn();
    mockEsClientInstance.ping.mockReturnValue(mockValue);

    const promise = clusterClient.callAsInternalUser('ping', undefined, {
      wrap401Errors: false,
      signal: controller.signal,
    });

    controller.abort();

    expect(mockValue.abort).toHaveBeenCalled();
    await expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(`"Request was aborted"`);
  });

  test('does not override WWW-Authenticate if returned by Elasticsearch', async () => {
    const mockAuthenticationError = new (errors.AuthenticationException as any)(
      'Authentication Exception',
      { statusCode: 401 }
    );

    const mockAuthenticationErrorWithHeader = new (errors.AuthenticationException as any)(
      'Authentication Exception',
      {
        body: { error: { header: { 'WWW-Authenticate': 'some custom header' } } },
        statusCode: 401,
      }
    );
    mockEsClientInstance.ping
      .mockRejectedValueOnce(mockAuthenticationError)
      .mockRejectedValueOnce(mockAuthenticationErrorWithHeader);

    await expect(clusterClient.callAsInternalUser('ping')).rejects.toBe(mockAuthenticationError);
    expect(get(mockAuthenticationError, 'output.headers.WWW-Authenticate')).toBe(
      'Basic realm="Authorization Required"'
    );

    await expect(clusterClient.callAsInternalUser('ping')).rejects.toBe(
      mockAuthenticationErrorWithHeader
    );
    expect(get(mockAuthenticationErrorWithHeader, 'output.headers.WWW-Authenticate')).toBe(
      'some custom header'
    );
  });
});

describe('#asScoped', () => {
  let mockEsClientInstance: { ping: jest.Mock; close: jest.Mock };
  let mockScopedEsClientInstance: { ping: jest.Mock; close: jest.Mock };

  let clusterClient: ClusterClient;
  let mockLogger: Logger;
  let mockEsConfig: ElasticsearchConfig;

  beforeEach(() => {
    mockEsClientInstance = { ping: jest.fn(), close: jest.fn() };
    mockScopedEsClientInstance = { ping: jest.fn(), close: jest.fn() };
    MockClient.mockImplementationOnce(() => mockEsClientInstance).mockImplementationOnce(
      () => mockScopedEsClientInstance
    );

    mockLogger = logger.get();
    mockEsConfig = {
      apiVersion: 'es-version',
      requestHeadersWhitelist: ['one', 'two'],
    } as any;

    clusterClient = new ClusterClient(mockEsConfig, mockLogger);
    jest.clearAllMocks();
  });

  test('creates additional Elasticsearch client only once', () => {
    const firstScopedClusterClient = clusterClient.asScoped(
      httpServerMock.createRawRequest({ headers: { one: '1' } })
    );

    expect(firstScopedClusterClient).toBeDefined();
    expect(mockParseElasticsearchClientConfig).toHaveBeenCalledTimes(1);
    expect(mockParseElasticsearchClientConfig).toHaveBeenLastCalledWith(mockEsConfig, mockLogger, {
      auth: false,
      ignoreCertAndKey: true,
    });

    expect(MockClient).toHaveBeenCalledTimes(1);
    expect(MockClient).toHaveBeenCalledWith(
      mockParseElasticsearchClientConfig.mock.results[0].value
    );

    jest.clearAllMocks();

    const secondScopedClusterClient = clusterClient.asScoped(
      httpServerMock.createRawRequest({ headers: { two: '2' } })
    );

    expect(secondScopedClusterClient).toBeDefined();
    expect(secondScopedClusterClient).not.toBe(firstScopedClusterClient);
    expect(mockParseElasticsearchClientConfig).not.toHaveBeenCalled();
    expect(MockClient).not.toHaveBeenCalled();
  });

  test('properly configures `ignoreCertAndKey` for various configurations', () => {
    // Config without SSL.
    clusterClient = new ClusterClient(mockEsConfig, mockLogger);

    mockParseElasticsearchClientConfig.mockClear();
    clusterClient.asScoped(httpServerMock.createRawRequest({ headers: { one: '1' } }));

    expect(mockParseElasticsearchClientConfig).toHaveBeenCalledTimes(1);
    expect(mockParseElasticsearchClientConfig).toHaveBeenLastCalledWith(mockEsConfig, mockLogger, {
      auth: false,
      ignoreCertAndKey: true,
    });

    // Config ssl.alwaysPresentCertificate === false
    mockEsConfig = { ...mockEsConfig, ssl: { alwaysPresentCertificate: false } } as any;
    clusterClient = new ClusterClient(mockEsConfig, mockLogger);

    mockParseElasticsearchClientConfig.mockClear();
    clusterClient.asScoped(httpServerMock.createRawRequest({ headers: { one: '1' } }));

    expect(mockParseElasticsearchClientConfig).toHaveBeenCalledTimes(1);
    expect(mockParseElasticsearchClientConfig).toHaveBeenLastCalledWith(mockEsConfig, mockLogger, {
      auth: false,
      ignoreCertAndKey: true,
    });

    // Config ssl.alwaysPresentCertificate === true
    mockEsConfig = { ...mockEsConfig, ssl: { alwaysPresentCertificate: true } } as any;
    clusterClient = new ClusterClient(mockEsConfig, mockLogger);

    mockParseElasticsearchClientConfig.mockClear();
    clusterClient.asScoped(httpServerMock.createRawRequest({ headers: { one: '1' } }));

    expect(mockParseElasticsearchClientConfig).toHaveBeenCalledTimes(1);
    expect(mockParseElasticsearchClientConfig).toHaveBeenLastCalledWith(mockEsConfig, mockLogger, {
      auth: false,
      ignoreCertAndKey: false,
    });
  });

  test('passes only filtered headers to the scoped cluster client', () => {
    clusterClient.asScoped(
      httpServerMock.createRawRequest({ headers: { zero: '0', one: '1', two: '2', three: '3' } })
    );

    expect(MockScopedClusterClient).toHaveBeenCalledTimes(1);
    expect(MockScopedClusterClient).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { one: '1', two: '2' }
    );
  });

  test('both scoped and internal API caller fail if cluster client is closed', async () => {
    clusterClient.asScoped(
      httpServerMock.createRawRequest({ headers: { zero: '0', one: '1', two: '2', three: '3' } })
    );

    clusterClient.close();

    const [[internalAPICaller, scopedAPICaller]] = MockScopedClusterClient.mock.calls;
    await expect(internalAPICaller('ping')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Cluster client cannot be used after it has been closed."`
    );

    await expect(scopedAPICaller('ping', {})).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Cluster client cannot be used after it has been closed."`
    );
  });

  test('does not fail when scope to not defined request', async () => {
    clusterClient = new ClusterClient(mockEsConfig, mockLogger);
    clusterClient.asScoped();
    expect(MockScopedClusterClient).toHaveBeenCalledTimes(1);
    expect(MockScopedClusterClient).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {}
    );
  });

  test('does not fail when scope to a request without headers', async () => {
    clusterClient = new ClusterClient(mockEsConfig, mockLogger);
    clusterClient.asScoped({} as any);
    expect(MockScopedClusterClient).toHaveBeenCalledTimes(1);
    expect(MockScopedClusterClient).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {}
    );
  });

  test('calls getAuthHeaders and filters results for a real request', async () => {
    clusterClient = new ClusterClient(mockEsConfig, mockLogger, () => ({ one: '1', three: '3' }));
    clusterClient.asScoped(httpServerMock.createRawRequest({ headers: { two: '2' } }));
    expect(MockScopedClusterClient).toHaveBeenCalledTimes(1);
    expect(MockScopedClusterClient).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { one: '1', two: '2' }
    );
  });

  test('getAuthHeaders results rewrite extends a request headers', async () => {
    clusterClient = new ClusterClient(mockEsConfig, mockLogger, () => ({ one: 'foo' }));
    clusterClient.asScoped(httpServerMock.createRawRequest({ headers: { one: '1', two: '2' } }));
    expect(MockScopedClusterClient).toHaveBeenCalledTimes(1);
    expect(MockScopedClusterClient).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { one: 'foo', two: '2' }
    );
  });

  test("doesn't call getAuthHeaders for a fake request", async () => {
    const getAuthHeaders = jest.fn();
    clusterClient = new ClusterClient(mockEsConfig, mockLogger, getAuthHeaders);
    clusterClient.asScoped({ headers: { one: '1', two: '2', three: '3' } });

    expect(getAuthHeaders).not.toHaveBeenCalled();
  });

  test('filters a fake request headers', async () => {
    clusterClient = new ClusterClient(mockEsConfig, mockLogger);
    clusterClient.asScoped({ headers: { one: '1', two: '2', three: '3' } });

    expect(MockScopedClusterClient).toHaveBeenCalledTimes(1);
    expect(MockScopedClusterClient).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { one: '1', two: '2' }
    );
  });
});

describe('#close', () => {
  let mockEsClientInstance: { close: jest.Mock };
  let mockScopedEsClientInstance: { close: jest.Mock };

  let clusterClient: ClusterClient;

  beforeEach(() => {
    mockEsClientInstance = { close: jest.fn() };
    mockScopedEsClientInstance = { close: jest.fn() };
    MockClient.mockImplementationOnce(() => mockEsClientInstance).mockImplementationOnce(
      () => mockScopedEsClientInstance
    );

    clusterClient = new ClusterClient(
      { apiVersion: 'es-version', requestHeadersWhitelist: [] } as any,
      logger.get()
    );
  });

  test('closes underlying Elasticsearch client', () => {
    expect(mockEsClientInstance.close).not.toHaveBeenCalled();

    clusterClient.close();
    expect(mockEsClientInstance.close).toHaveBeenCalledTimes(1);
  });

  test('closes both internal and scoped underlying Elasticsearch clients', () => {
    clusterClient.asScoped(httpServerMock.createRawRequest({ headers: { one: '1' } }));

    expect(mockEsClientInstance.close).not.toHaveBeenCalled();
    expect(mockScopedEsClientInstance.close).not.toHaveBeenCalled();

    clusterClient.close();
    expect(mockEsClientInstance.close).toHaveBeenCalledTimes(1);
    expect(mockScopedEsClientInstance.close).toHaveBeenCalledTimes(1);
  });

  test('does not call close on already closed client', () => {
    clusterClient.asScoped(httpServerMock.createRawRequest({ headers: { one: '1' } }));

    clusterClient.close();
    mockEsClientInstance.close.mockClear();
    mockScopedEsClientInstance.close.mockClear();

    clusterClient.close();
    expect(mockEsClientInstance.close).not.toHaveBeenCalled();
    expect(mockScopedEsClientInstance.close).not.toHaveBeenCalled();
  });
});
