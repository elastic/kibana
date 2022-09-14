/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./log_query_and_deprecation', () => ({
  __esModule: true,
  instrumentEsQueryAndDeprecationLogger: jest.fn(),
}));
jest.mock('./agent_manager');

import { Agent } from 'http';
import {
  parseClientOptionsMock,
  createTransportMock,
  ClientMock,
} from './configure_client.test.mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ClusterConnectionPool } from '@elastic/elasticsearch';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { configureClient } from './configure_client';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';
import { AgentManager } from './agent_manager';

const AgentManagerMock = AgentManager as jest.Mock<AgentManager>;

const createFakeConfig = (
  parts: Partial<ElasticsearchClientConfig> = {}
): ElasticsearchClientConfig => {
  return {
    type: 'fake-config',
    ...parts,
  } as unknown as ElasticsearchClientConfig;
};

const createFakeClient = () => {
  const actualEs = jest.requireActual('@elastic/elasticsearch');
  const client = new actualEs.Client({
    nodes: ['http://localhost'], // Enforcing `nodes` because it's mandatory
  });
  return client;
};

const createFakeAgentFactory = (logger: MockedLogger) => {
  const agentFactory = () => new Agent();

  AgentManagerMock.mockImplementationOnce(() => {
    const agentManager = new AgentManager();
    agentManager.getAgentFactory = () => agentFactory;
    return agentManager;
  });

  const agentManager = new AgentManager();

  return { agentManager, agentFactory };
};

describe('configureClient', () => {
  let logger: MockedLogger;
  let config: ElasticsearchClientConfig;
  let agentManager: AgentManager;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    config = createFakeConfig();
    parseClientOptionsMock.mockReturnValue({});
    ClientMock.mockImplementation(() => createFakeClient());
    agentManager = new AgentManager();
  });

  afterEach(() => {
    parseClientOptionsMock.mockReset();
    ClientMock.mockReset();
    jest.clearAllMocks();
  });

  it('calls `parseClientOptions` with the correct parameters', () => {
    configureClient(config, { logger, type: 'test', scoped: false, agentManager });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, false);

    parseClientOptionsMock.mockClear();

    configureClient(config, { logger, type: 'test', scoped: true, agentManager });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, true);
  });

  it('constructs a client using the options returned by `parseClientOptions`', () => {
    const parsedOptions = {
      nodes: ['http://localhost'],
    };
    parseClientOptionsMock.mockReturnValue(parsedOptions);

    const client = configureClient(config, { logger, type: 'test', scoped: false, agentManager });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(expect.objectContaining(parsedOptions));
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('constructs a client using the provided `agentManager`', () => {
    const { agentManager: customAgentManager, agentFactory } = createFakeAgentFactory(logger);
    const client = configureClient(config, {
      logger,
      type: 'test',
      scoped: false,
      agentManager: customAgentManager,
    });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(expect.objectContaining({ agent: agentFactory }));
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('calls `createTransport` with the correct parameters', () => {
    const getExecutionContext = jest.fn();
    configureClient(config, {
      logger,
      type: 'test',
      scoped: false,
      getExecutionContext,
      agentManager,
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith({ getExecutionContext });

    createTransportMock.mockClear();

    configureClient(config, {
      logger,
      type: 'test',
      scoped: true,
      getExecutionContext,
      agentManager,
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith({ getExecutionContext });
  });

  it('constructs a client using the Transport returned by `createTransport`', () => {
    const mockedTransport = { mockTransport: true };
    createTransportMock.mockReturnValue(mockedTransport);

    const client = configureClient(config, { logger, type: 'test', scoped: false, agentManager });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Transport: mockedTransport,
      })
    );
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('constructs a client using `ClusterConnectionPool` for `ConnectionPool` ', () => {
    const mockedTransport = { mockTransport: true };
    createTransportMock.mockReturnValue(mockedTransport);

    const client = configureClient(config, { logger, type: 'test', scoped: false, agentManager });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ConnectionPool: ClusterConnectionPool,
      })
    );
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('calls instrumentEsQueryAndDeprecationLogger', () => {
    const client = configureClient(config, { logger, type: 'test', scoped: false, agentManager });

    expect(instrumentEsQueryAndDeprecationLogger).toHaveBeenCalledTimes(1);
    expect(instrumentEsQueryAndDeprecationLogger).toHaveBeenCalledWith({
      logger,
      client,
      type: 'test',
    });
  });
});
