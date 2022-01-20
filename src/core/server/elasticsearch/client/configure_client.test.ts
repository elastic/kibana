/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./log_query_and_deprecation.ts', () => ({
  __esModule: true,
  instrumentEsQueryAndDeprecationLogger: jest.fn(),
}));

import {
  parseClientOptionsMock,
  createTransportMock,
  ClientMock,
} from './configure_client.test.mocks';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import type { ElasticsearchClientConfig } from './client_config';
import { configureClient } from './configure_client';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';

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

describe('configureClient', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let config: ElasticsearchClientConfig;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    config = createFakeConfig();
    parseClientOptionsMock.mockReturnValue({});
    ClientMock.mockImplementation(() => createFakeClient());
  });

  afterEach(() => {
    parseClientOptionsMock.mockReset();
    ClientMock.mockReset();
    jest.clearAllMocks();
  });

  it('calls `parseClientOptions` with the correct parameters', () => {
    configureClient(config, { logger, type: 'test', scoped: false });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, false);

    parseClientOptionsMock.mockClear();

    configureClient(config, { logger, type: 'test', scoped: true });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, true);
  });

  it('constructs a client using the options returned by `parseClientOptions`', () => {
    const parsedOptions = {
      nodes: ['http://localhost'],
    };
    parseClientOptionsMock.mockReturnValue(parsedOptions);

    const client = configureClient(config, { logger, type: 'test', scoped: false });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(expect.objectContaining(parsedOptions));
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('calls `createTransport` with the correct parameters', () => {
    const getExecutionContext = jest.fn();
    configureClient(config, { logger, type: 'test', scoped: false, getExecutionContext });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith({ getExecutionContext });

    createTransportMock.mockClear();

    configureClient(config, { logger, type: 'test', scoped: true, getExecutionContext });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith({ getExecutionContext });
  });

  it('constructs a client using the Transport returned by `createTransport`', () => {
    const mockedTransport = { mockTransport: true };
    createTransportMock.mockReturnValue(mockedTransport);

    const client = configureClient(config, { logger, type: 'test', scoped: false });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Transport: mockedTransport,
      })
    );
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('calls instrumentEsQueryAndDeprecationLogger', () => {
    const client = configureClient(config, { logger, type: 'test', scoped: false });

    expect(instrumentEsQueryAndDeprecationLogger).toHaveBeenCalledTimes(1);
    expect(instrumentEsQueryAndDeprecationLogger).toHaveBeenCalledWith({
      logger,
      client,
      type: 'test',
    });
  });
});
