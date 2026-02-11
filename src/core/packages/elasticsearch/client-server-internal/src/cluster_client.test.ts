/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  configureClientMock,
  createTransportMock,
  createInternalErrorHandlerMock,
} from './cluster_client.test.mocks';
import type { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type {
  ElasticsearchClientConfig,
  ElasticsearchClient,
} from '@kbn/core-elasticsearch-server';
import { ClusterClient } from './cluster_client';
import {
  DEFAULT_HEADERS,
  ES_SECONDARY_AUTH_HEADER,
  AUTHORIZATION_HEADER,
  getDefaultHeaders,
  ES_SECONDARY_CLIENT_AUTH_HEADER,
  ES_CLIENT_AUTHENTICATION_HEADER,
} from './headers';
import { AgentManager } from './agent_manager';
import { duration } from 'moment';
import { securityServiceMock } from '@kbn/core-security-server-mocks';

const createConfig = (
  parts: Partial<ElasticsearchClientConfig> = {}
): ElasticsearchClientConfig => {
  return {
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    sniffInterval: false,
    maxSockets: Infinity,
    maxIdleSockets: 200,
    idleSocketTimeout: duration('30s'),
    compression: false,
    requestHeadersWhitelist: ['authorization'],
    customHeaders: {},
    hosts: ['http://localhost'],
    dnsCacheTtl: duration(0, 'seconds'),
    ...parts,
  };
};

const kibanaVersion = '1.0.0';
const defaultHeaders = getDefaultHeaders(kibanaVersion);

const createClient = () =>
  ({ close: jest.fn(), child: jest.fn() } as unknown as jest.Mocked<Client>);

describe('ClusterClient', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let authHeaders: ReturnType<typeof httpServiceMock.createAuthHeaderStorage>;
  let internalClient: jest.Mocked<Client>;
  let scopedClient: jest.Mocked<Client>;
  let agentFactoryProvider: AgentManager;
  let client: ElasticsearchClient;

  const mockTransport = { mockTransport: true };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    internalClient = createClient();
    scopedClient = createClient();
    agentFactoryProvider = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });

    authHeaders = httpServiceMock.createAuthHeaderStorage();
    authHeaders.get.mockImplementation(() => ({
      authorization: 'auth',
      foo: 'bar',
    }));

    configureClientMock.mockImplementation((config, { scoped = false }) => {
      return scoped ? scopedClient : internalClient;
    });
    createTransportMock.mockReturnValue(mockTransport);
  });

  afterEach(() => {
    configureClientMock.mockReset();
    createTransportMock.mockReset();
    createInternalErrorHandlerMock.mockReset();
  });

  it('creates a single internal and scoped client during initialization', () => {
    const config = createConfig();
    const getExecutionContextMock = jest.fn();

    new ClusterClient({
      config,
      logger,
      authHeaders,
      type: 'custom-type',
      getExecutionContext: getExecutionContextMock,
      agentFactoryProvider,
      kibanaVersion,
    });

    expect(configureClientMock).toHaveBeenCalledTimes(2);
    expect(configureClientMock).toHaveBeenCalledWith(config, {
      logger,
      agentFactoryProvider,
      kibanaVersion,
      type: 'custom-type',
      getExecutionContext: getExecutionContextMock,
    });
    expect(configureClientMock).toHaveBeenCalledWith(config, {
      logger,
      agentFactoryProvider,
      kibanaVersion,
      type: 'custom-type',
      getExecutionContext: getExecutionContextMock,
      scoped: true,
    });
  });

  describe('#asInternalUser', () => {
    it('returns the internal client', () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });

      expect(clusterClient.asInternalUser).toBe(internalClient);
    });
  });

  describe('#asScoped().asCurrentUser', () => {
    it('lazily instantiate the client when first called', () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      expect(scopedClient.child).not.toHaveBeenCalled();

      const scopedClusterClient = clusterClient.asScoped(request);

      expect(scopedClient.child).not.toHaveBeenCalled();

      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith({
        headers: expect.any(Object),
        Transport: mockTransport,
      });

      expect(client).toBe(scopedClient.child.mock.results[0].value);
    });

    it('returns a scoped cluster client bound to the request', () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      const scopedClusterClient = clusterClient.asScoped(request);

      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith({
        headers: expect.any(Object),
        Transport: mockTransport,
      });

      expect(scopedClusterClient.asInternalUser).toBe(clusterClient.asInternalUser);
      expect(scopedClusterClient.asCurrentUser).toBe(scopedClient.child.mock.results[0].value);
    });

    it('calls `createTransport` with the correct parameters', () => {
      const getExecutionContext = jest.fn();
      const getUnauthorizedErrorHandler = jest.fn();
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        getExecutionContext,
        getUnauthorizedErrorHandler,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(createTransportMock).toHaveBeenCalledTimes(1);
      expect(createTransportMock).toHaveBeenCalledWith({
        scoped: true,
        getExecutionContext,
        getUnauthorizedErrorHandler: expect.any(Function),
        onRequest: undefined,
      });
    });

    it('calls `createInternalErrorHandler` lazily', () => {
      const getExecutionContext = jest.fn();
      const getUnauthorizedErrorHandler = jest.fn();
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        getExecutionContext,
        getUnauthorizedErrorHandler,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      const scopedClusterClient = clusterClient.asScoped(request);
      client = scopedClusterClient.asCurrentUser;

      expect(createTransportMock).toHaveBeenCalledTimes(1);
      expect(createTransportMock).toHaveBeenCalledWith({
        scoped: true,
        getExecutionContext,
        getUnauthorizedErrorHandler: expect.any(Function),
        onRequest: undefined,
      });

      const { getUnauthorizedErrorHandler: getHandler } = createTransportMock.mock.calls[0][0];

      expect(createInternalErrorHandlerMock).not.toHaveBeenCalled();

      getHandler();

      expect(createInternalErrorHandlerMock).toHaveBeenCalledTimes(1);
      expect(createInternalErrorHandlerMock).toHaveBeenCalledWith({
        request,
        getHandler: getUnauthorizedErrorHandler,
        setAuthHeaders: authHeaders.set,
      });
    });

    it('passes `onRequest` handler to `createTransport`', () => {
      const getExecutionContext = jest.fn();
      const onRequest = jest.fn();
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        getExecutionContext,
        agentFactoryProvider,
        kibanaVersion,
        onRequest,
      });
      const request = httpServerMock.createKibanaRequest();

      const scopedClusterClient = clusterClient.asScoped(request);
      client = scopedClusterClient.asCurrentUser;

      expect(createTransportMock).toHaveBeenCalledTimes(1);
      expect(createTransportMock).toHaveBeenCalledWith({
        scoped: true,
        getExecutionContext,
        getUnauthorizedErrorHandler: expect.any(Function),
        onRequest,
      });
    });

    it('returns a distinct scoped cluster client on each call', () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      const scopedClusterClient1 = clusterClient.asScoped(request);
      const scopedClusterClient2 = clusterClient.asScoped(request);

      // trigger client instantiation via getter
      client = scopedClusterClient1.asCurrentUser;
      client = scopedClusterClient2.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(2);

      expect(scopedClusterClient1).not.toBe(scopedClusterClient2);
      expect(scopedClusterClient1.asInternalUser).toBe(scopedClusterClient2.asInternalUser);
    });

    it('creates a scoped client with filtered request headers', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['foo'],
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: {
          foo: 'bar',
          hello: 'dolly',
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { ...defaultHeaders, foo: 'bar', 'x-opaque-id': expect.any(String) },
        })
      );
    });

    it('does not filter auth headers', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      authHeaders.get.mockReturnValue({
        authorization: 'auth',
        other: 'yep',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({});

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            authorization: 'auth',
            other: 'yep',
            'x-opaque-id': expect.any(String),
          },
        })
      );
    });

    it('respects auth headers precedence', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      authHeaders.get.mockReturnValue({
        authorization: 'auth',
        other: 'yep',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: 'override',
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            authorization: 'auth',
            other: 'yep',
            'x-opaque-id': expect.any(String),
          },
        })
      );
    });

    it('includes the `customHeaders` from the config without filtering them', () => {
      const config = createConfig({
        customHeaders: {
          foo: 'bar',
          hello: 'dolly',
        },
        requestHeadersWhitelist: ['authorization'],
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({});

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            foo: 'bar',
            hello: 'dolly',
            'x-opaque-id': expect.any(String),
          },
        })
      );
    });

    it('adds the x-opaque-id header based on the request id', () => {
      const config = createConfig();
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        kibanaRequestState: {
          requestId: 'my-fake-id',
          requestUuid: 'ignore-this-id',
          startTime: Date.now(),
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            'x-opaque-id': 'my-fake-id',
          },
        })
      );
    });

    it('respect the precedence of auth headers over config headers', () => {
      const config = createConfig({
        customHeaders: {
          foo: 'config',
          hello: 'dolly',
        },
        requestHeadersWhitelist: ['foo'],
      });
      authHeaders.get.mockReturnValue({
        foo: 'auth',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({});

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            foo: 'auth',
            hello: 'dolly',
            'x-opaque-id': expect.any(String),
          },
        })
      );
    });

    it('respect the precedence of request headers over config headers', () => {
      const config = createConfig({
        customHeaders: {
          foo: 'config',
          hello: 'dolly',
        },
        requestHeadersWhitelist: ['foo'],
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { foo: 'request' },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            foo: 'request',
            hello: 'dolly',
            'x-opaque-id': expect.any(String),
          },
        })
      );
    });

    it('respect the precedence of config headers over default headers', () => {
      const headerKey = Object.keys(DEFAULT_HEADERS)[0];
      const config = createConfig({
        customHeaders: {
          ...defaultHeaders,
          [headerKey]: 'foo',
        },
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            [headerKey]: 'foo',
            'x-opaque-id': expect.any(String),
          },
        })
      );
    });

    it('respect the precedence of request headers over default headers', () => {
      const headerKey = Object.keys(DEFAULT_HEADERS)[0];
      const config = createConfig({
        requestHeadersWhitelist: [headerKey],
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { [headerKey]: 'foo' },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            [headerKey]: 'foo',
            'x-opaque-id': expect.any(String),
          },
        })
      );
    });

    it('respect the precedence of x-opaque-id header over config headers', () => {
      const config = createConfig({
        customHeaders: {
          'x-opaque-id': 'from config',
        },
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { foo: 'request' },
        kibanaRequestState: {
          requestId: 'from request',
          requestUuid: 'ignore-this-id',
          startTime: Date.now(),
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            'x-opaque-id': 'from request',
          },
        })
      );
    });

    it('filter headers when called with a `FakeRequest`', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = {
        headers: {
          authorization: 'auth',
          hello: 'dolly',
        },
      };

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { ...defaultHeaders, authorization: 'auth' },
        })
      );
    });

    it('does not add auth headers when called with a `FakeRequest`', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization', 'foo'],
      });
      authHeaders.get.mockReturnValue({
        authorization: 'auth',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = {
        headers: {
          foo: 'bar',
          hello: 'dolly',
        },
      };

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { ...defaultHeaders, foo: 'bar' },
        })
      );
    });

    it('does not specify client authentication for non-UIAM credentials even if in UIAM mode', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      authHeaders.get.mockReturnValue({ [AUTHORIZATION_HEADER]: 'Bearer yes' });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        security: securityServiceMock.createInternalSetup(),
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { [AUTHORIZATION_HEADER]: 'Bearer override' },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            [AUTHORIZATION_HEADER]: 'Bearer yes',
            'x-opaque-id': expect.any(String),
          },
        })
      );
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: { [ES_CLIENT_AUTHENTICATION_HEADER]: 'some-shared-secret' },
        })
      );
    });

    it('does not specify client authentication for UIAM credentials in real requests even if in UIAM mode', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization'],
      });
      authHeaders.get.mockReturnValue({ [AUTHORIZATION_HEADER]: 'Bearer essu_dev_yes' });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        security: securityServiceMock.createInternalSetup(),
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { [AUTHORIZATION_HEADER]: 'Bearer override' },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            [AUTHORIZATION_HEADER]: 'Bearer essu_dev_yes',
            'x-opaque-id': expect.any(String),
          },
        })
      );
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: { [ES_CLIENT_AUTHENTICATION_HEADER]: 'some-shared-secret' },
        })
      );
    });

    it('specifies client authentication for UIAM credentials in fake requests if in UIAM mode ', () => {
      const config = createConfig({ requestHeadersWhitelist: ['authorization'] });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        security: securityServiceMock.createInternalSetup(),
        agentFactoryProvider,
        kibanaVersion,
      });
      const fakeRequest = httpServerMock.createFakeKibanaRequest({
        headers: { [AUTHORIZATION_HEADER]: 'Bearer essu_dev_yes' },
      });

      const scopedClusterClient = clusterClient.asScoped(fakeRequest);
      // trigger client instantiation via getter
      client = scopedClusterClient.asCurrentUser;

      expect(scopedClient.child).toHaveBeenCalledTimes(1);
      expect(scopedClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            [AUTHORIZATION_HEADER]: 'Bearer essu_dev_yes',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'some-shared-secret',
          },
        })
      );
    });
  });

  describe('#asScoped().asSecondaryAuthUser', () => {
    it('lazily instantiate the client when first called', () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      expect(internalClient.child).not.toHaveBeenCalled();

      const scopedClusterClient = clusterClient.asScoped(request);

      expect(internalClient.child).not.toHaveBeenCalled();

      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith({
        headers: expect.any(Object),
      });

      expect(client).toBe(internalClient.child.mock.results[0].value);
    });

    it('returns a scoped cluster client bound to the request', () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest();

      const scopedClusterClient = clusterClient.asScoped(request);

      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(scopedClusterClient.asSecondaryAuthUser).toBe(
        internalClient.child.mock.results[0].value
      );
    });

    it('creates a scoped client using the proper `es-secondary-authorization` header', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['foo'],
      });
      authHeaders.get.mockReturnValue({
        [AUTHORIZATION_HEADER]: 'Bearer yes',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: {
          foo: 'bar',
          hello: 'dolly',
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { ...defaultHeaders, [ES_SECONDARY_AUTH_HEADER]: 'Bearer yes' },
        })
      );
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: { [AUTHORIZATION_HEADER]: 'Bearer yes' },
        })
      );
    });

    it('throws when used with a request without authorization header', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['foo'],
      });
      authHeaders.get.mockReturnValue({});

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: {
          foo: 'bar',
          hello: 'dolly',
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      expect(() => {
        client = scopedClusterClient.asSecondaryAuthUser;
      }).toThrowErrorMatchingInlineSnapshot(
        `"asSecondaryAuthUser called from a client scoped to a request without 'authorization' header."`
      );
    });

    it('includes the `customHeaders` from the config without filtering them', () => {
      const config = createConfig({
        customHeaders: {
          foo: 'bar',
          hello: 'dolly',
        },
        requestHeadersWhitelist: ['authorization'],
      });
      authHeaders.get.mockReturnValue({
        [AUTHORIZATION_HEADER]: 'Bearer foo',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({});

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            [ES_SECONDARY_AUTH_HEADER]: 'Bearer foo',
            foo: 'bar',
            hello: 'dolly',
          },
        })
      );
    });

    it('does not add the x-opaque-id header based on the request id', () => {
      const config = createConfig();
      authHeaders.get.mockReturnValue({
        [AUTHORIZATION_HEADER]: 'Bearer foo',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({
        kibanaRequestState: {
          requestId: 'my-fake-id',
          requestUuid: 'ignore-this-id',
          startTime: Date.now(),
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'x-opaque-id': expect.any(String),
          }),
        })
      );
    });

    it('uses the authorization header from the request when using a `FakeRequest`', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization', 'foo'],
      });
      authHeaders.get.mockReturnValue({
        [AUTHORIZATION_HEADER]: 'Bearer will_not_be_used',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = {
        headers: {
          [AUTHORIZATION_HEADER]: 'Bearer yes',
          hello: 'dolly',
        },
      };

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ [ES_SECONDARY_AUTH_HEADER]: 'Bearer yes' }),
        })
      );
    });

    it('uses the authorization header from the request when using a `KibanaFakeRequest`', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization', 'foo'],
      });
      authHeaders.get.mockReturnValue({
        [AUTHORIZATION_HEADER]: 'Bearer will_not_be_used',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });

      const request = httpServerMock.createFakeKibanaRequest({
        headers: {
          authorization: 'Bearer fake_request_auth',
        },
      });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            [ES_SECONDARY_AUTH_HEADER]: request.headers.authorization,
          }),
        })
      );
    });

    it('throws when used with a `FakeRequest` without authorization header', () => {
      const config = createConfig({
        requestHeadersWhitelist: ['authorization', 'foo'],
      });
      authHeaders.get.mockReturnValue({
        [AUTHORIZATION_HEADER]: 'will_not_be_used',
      });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = {
        headers: {
          hello: 'dolly',
        },
      };

      const scopedClusterClient = clusterClient.asScoped(request);

      expect(() => {
        // trigger client instantiation via getter
        client = scopedClusterClient.asSecondaryAuthUser;
      }).toThrowErrorMatchingInlineSnapshot(
        `"asSecondaryAuthUser called from a client scoped to a request without 'authorization' header."`
      );
    });

    it('does not specify secondary client authentication for non-UIAM credentials even if in UIAM mode', () => {
      const config = createConfig({ requestHeadersWhitelist: ['foo'] });
      authHeaders.get.mockReturnValue({ [AUTHORIZATION_HEADER]: 'Bearer yes' });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        security: securityServiceMock.createInternalSetup(),
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({ headers: { foo: 'bar' } });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { ...defaultHeaders, [ES_SECONDARY_AUTH_HEADER]: 'Bearer yes' },
        })
      );
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: { [ES_SECONDARY_CLIENT_AUTH_HEADER]: 'some-shared-secret' },
        })
      );
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: { [AUTHORIZATION_HEADER]: 'Bearer yes' },
        })
      );
    });

    it('specifies secondary client authentication for UIAM credentials if in UIAM mode', () => {
      const config = createConfig({ requestHeadersWhitelist: ['foo'] });
      authHeaders.get.mockReturnValue({ [AUTHORIZATION_HEADER]: 'Bearer essu_dev_yes' });

      const clusterClient = new ClusterClient({
        config,
        logger,
        type: 'custom-type',
        authHeaders,
        security: securityServiceMock.createInternalSetup(),
        agentFactoryProvider,
        kibanaVersion,
      });
      const request = httpServerMock.createKibanaRequest({ headers: { foo: 'bar' } });

      const scopedClusterClient = clusterClient.asScoped(request);
      // trigger client instantiation via getter
      client = scopedClusterClient.asSecondaryAuthUser;

      expect(internalClient.child).toHaveBeenCalledTimes(1);
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            [ES_SECONDARY_AUTH_HEADER]: 'Bearer essu_dev_yes',
            [ES_SECONDARY_CLIENT_AUTH_HEADER]: 'some-shared-secret',
          },
        })
      );
      expect(internalClient.child).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: { [AUTHORIZATION_HEADER]: 'Bearer essu_dev_yes' },
        })
      );
    });
  });

  describe('#close', () => {
    it('closes both underlying clients', async () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });

      await clusterClient.close();

      expect(internalClient.close).toHaveBeenCalledTimes(1);
      expect(scopedClient.close).toHaveBeenCalledTimes(1);
    });

    it('waits for both clients to close', (done) => {
      expect.assertions(4);

      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });

      let internalClientClosed = false;
      let scopedClientClosed = false;
      let clusterClientClosed = false;

      let closeInternalClient: () => void;
      let closeScopedClient: () => void;

      internalClient.close.mockReturnValue(
        new Promise<void>((resolve) => {
          closeInternalClient = resolve;
        }).then(() => {
          expect(clusterClientClosed).toBe(false);
          internalClientClosed = true;
        })
      );
      scopedClient.close.mockReturnValue(
        new Promise<void>((resolve) => {
          closeScopedClient = resolve;
        }).then(() => {
          expect(clusterClientClosed).toBe(false);
          scopedClientClosed = true;
        })
      );

      clusterClient.close().then(() => {
        clusterClientClosed = true;
        expect(internalClientClosed).toBe(true);
        expect(scopedClientClosed).toBe(true);
        done();
      });

      closeInternalClient!();
      closeScopedClient!();
    });

    it('return a rejected promise is any client rejects', async () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });

      internalClient.close.mockRejectedValue(new Error('error closing client'));

      expect(clusterClient.close()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"error closing client"`
      );
    });

    it('does nothing after the first call', async () => {
      const clusterClient = new ClusterClient({
        config: createConfig(),
        logger,
        type: 'custom-type',
        authHeaders,
        agentFactoryProvider,
        kibanaVersion,
      });

      await clusterClient.close();

      expect(internalClient.close).toHaveBeenCalledTimes(1);
      expect(scopedClient.close).toHaveBeenCalledTimes(1);

      await clusterClient.close();
      await clusterClient.close();

      expect(internalClient.close).toHaveBeenCalledTimes(1);
      expect(scopedClient.close).toHaveBeenCalledTimes(1);
    });
  });
});
