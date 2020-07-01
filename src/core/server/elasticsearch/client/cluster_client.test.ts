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

import type { Client } from '@elastic/elasticsearch';
import { configureClientMock, getClientFacadeMock } from './cluster_client.test.mocks';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { httpServerMock } from '../../http/http_server.mocks';
import { GetAuthHeaders } from '../../http';
import { elasticsearchClientMock } from './mocks';
import { ClusterClient } from './cluster_client';
import { ElasticsearchClientConfig } from './client_config';

const createClientMock = (): jest.Mocked<Client> => {
  return ({
    close: jest.fn(),
  } as unknown) as jest.Mocked<Client>;
};

const createConfig = (
  parts: Partial<ElasticsearchClientConfig> = {}
): ElasticsearchClientConfig => {
  return {
    logQueries: false,
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    sniffInterval: false,
    requestHeadersWhitelist: ['authorization'],
    customHeaders: {},
    hosts: ['http://localhost'],
    ...parts,
  };
};

describe('ClusterClient', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let getAuthHeaders: jest.MockedFunction<GetAuthHeaders>;
  let internalClient: jest.Mocked<Client>;
  let scopedClient: jest.Mocked<Client>;
  let internalFacade: ReturnType<typeof elasticsearchClientMock.createFacade>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    internalClient = createClientMock();
    scopedClient = createClientMock();
    internalFacade = elasticsearchClientMock.createFacade();
    getAuthHeaders = jest.fn().mockImplementation(() => ({
      authorization: 'auth',
      foo: 'bar',
    }));

    configureClientMock.mockImplementation((config, { scoped = false }) => {
      return scoped ? scopedClient : internalClient;
    });

    getClientFacadeMock.mockImplementation((client) => {
      if (client === internalClient) {
        return internalFacade;
      }
      return elasticsearchClientMock.createFacade();
    });
  });

  afterEach(() => {
    configureClientMock.mockReset();
    getClientFacadeMock.mockReset();
  });

  it('creates a single internal and scoped client during initialization', () => {
    const config = createConfig();

    new ClusterClient(config, logger, getAuthHeaders);

    expect(configureClientMock).toHaveBeenCalledTimes(2);
    expect(configureClientMock).toHaveBeenCalledWith(config, { logger });
    expect(configureClientMock).toHaveBeenCalledWith(config, { logger, scoped: true });

    expect(getClientFacadeMock).toHaveBeenCalledTimes(1);
    expect(getClientFacadeMock).toHaveBeenCalledWith(internalClient);
  });

  describe('#asInternalUser', () => {
    it('returns the facade using the internal client', () => {
      const clusterClient = new ClusterClient(createConfig(), logger, getAuthHeaders);

      getClientFacadeMock.mockClear();

      expect(clusterClient.asInternalUser()).toBe(internalFacade);
      expect(getClientFacadeMock).not.toHaveBeenCalled();
    });
  });

  describe('#asScoped', () => {
    it('returns a scoped cluster client bound to the request', () => {
      const clusterClient = new ClusterClient(createConfig(), logger, getAuthHeaders);
      const request = httpServerMock.createKibanaRequest();

      getClientFacadeMock.mockClear();

      const scopedClusterClient = clusterClient.asScoped(request);

      expect(getClientFacadeMock).toHaveBeenCalledTimes(1);
      expect(getClientFacadeMock).toHaveBeenCalledWith(scopedClient, expect.any(Object));

      expect(scopedClusterClient.asInternalUser()).toBe(clusterClient.asInternalUser());
      expect(scopedClusterClient.asCurrentUser()).toBe(getClientFacadeMock.mock.results[0].value);
    });

    it('returns a distinct facade on each call', () => {
      const clusterClient = new ClusterClient(createConfig(), logger, getAuthHeaders);
      const request = httpServerMock.createKibanaRequest();

      getClientFacadeMock.mockClear();

      const scopedClusterClient1 = clusterClient.asScoped(request);
      const scopedClusterClient2 = clusterClient.asScoped(request);

      expect(getClientFacadeMock).toHaveBeenCalledTimes(2);

      expect(scopedClusterClient1).not.toBe(scopedClusterClient2);
      expect(scopedClusterClient1.asInternalUser()).toBe(scopedClusterClient2.asInternalUser());
    });

    it('creates a scoped facade with filtered request headers', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['foo'],
      });
      getAuthHeaders.mockReturnValue({});

      const clusterClient = new ClusterClient(config, logger, getAuthHeaders);
      const request = httpServerMock.createKibanaRequest({
        headers: {
          foo: 'bar',
          hello: 'dolly',
        },
      });

      getClientFacadeMock.mockClear();

      clusterClient.asScoped(request);

      expect(getClientFacadeMock).toHaveBeenCalledTimes(1);
      expect(getClientFacadeMock).toHaveBeenCalledWith(scopedClient, {
        foo: 'bar',
      });
    });

    it('creates a scoped facade with filtered auth headers', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      getAuthHeaders.mockReturnValue({
        authorization: 'auth',
        other: 'nope',
      });

      const clusterClient = new ClusterClient(config, logger, getAuthHeaders);
      const request = httpServerMock.createKibanaRequest({});

      getClientFacadeMock.mockClear();

      clusterClient.asScoped(request);

      expect(getClientFacadeMock).toHaveBeenCalledTimes(1);
      expect(getClientFacadeMock).toHaveBeenCalledWith(scopedClient, {
        authorization: 'auth',
      });
    });

    it('respects auth headers precedence', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      getAuthHeaders.mockReturnValue({
        authorization: 'auth',
        other: 'nope',
      });

      const clusterClient = new ClusterClient(config, logger, getAuthHeaders);
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: 'override',
        },
      });

      getClientFacadeMock.mockClear();

      clusterClient.asScoped(request);

      expect(getClientFacadeMock).toHaveBeenCalledTimes(1);
      expect(getClientFacadeMock).toHaveBeenCalledWith(scopedClient, {
        authorization: 'auth',
      });
    });

    it('filter headers when called with a `FakeRequest`', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      getAuthHeaders.mockReturnValue({});

      const clusterClient = new ClusterClient(config, logger, getAuthHeaders);
      const request = {
        headers: {
          authorization: 'auth',
          hello: 'dolly',
        },
      };

      getClientFacadeMock.mockClear();

      clusterClient.asScoped(request);

      expect(getClientFacadeMock).toHaveBeenCalledTimes(1);
      expect(getClientFacadeMock).toHaveBeenCalledWith(scopedClient, {
        authorization: 'auth',
      });
    });

    it('does not add auth headers when called with a `FakeRequest`', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization', 'foo'],
      });
      getAuthHeaders.mockReturnValue({
        authorization: 'auth',
      });

      const clusterClient = new ClusterClient(config, logger, getAuthHeaders);
      const request = {
        headers: {
          foo: 'bar',
          hello: 'dolly',
        },
      };

      getClientFacadeMock.mockClear();

      clusterClient.asScoped(request);

      expect(getClientFacadeMock).toHaveBeenCalledTimes(1);
      expect(getClientFacadeMock).toHaveBeenCalledWith(scopedClient, {
        foo: 'bar',
      });
    });
  });

  describe('#close', () => {
    it('closes both underlying clients', () => {
      const clusterClient = new ClusterClient(createConfig(), logger, getAuthHeaders);

      clusterClient.close();

      expect(internalClient.close).toHaveBeenCalledTimes(1);
      expect(scopedClient.close).toHaveBeenCalledTimes(1);
    });

    it('does nothing after the first call', () => {
      const clusterClient = new ClusterClient(createConfig(), logger, getAuthHeaders);

      clusterClient.close();

      expect(internalClient.close).toHaveBeenCalledTimes(1);
      expect(scopedClient.close).toHaveBeenCalledTimes(1);

      clusterClient.close();
      clusterClient.close();

      expect(internalClient.close).toHaveBeenCalledTimes(1);
      expect(scopedClient.close).toHaveBeenCalledTimes(1);
    });
  });
});
