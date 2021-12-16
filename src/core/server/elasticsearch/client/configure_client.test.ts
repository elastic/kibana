/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';

jest.mock('./log_query_and_deprecation.ts', () => ({
  __esModule: true,
  instrumentEsQueryAndDeprecationLogger: jest.fn(),
}));

import { parseClientOptionsMock, ClientMock } from './configure_client.test.mocks';
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

function getProductCheckValue(client: Client) {
  const tSymbol = Object.getOwnPropertySymbols(client.transport || client).filter(
    (symbol) => symbol.description === 'product check'
  )[0];
  // @ts-expect-error `tSymbol` is missing in the index signature of Transport
  return (client.transport || client)[tSymbol];
}

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

  it('calls instrumentEsQueryAndDeprecationLogger', () => {
    const client = configureClient(config, { logger, type: 'test', scoped: false });
    expect(instrumentEsQueryAndDeprecationLogger).toHaveBeenCalledTimes(1);
    expect(instrumentEsQueryAndDeprecationLogger).toHaveBeenCalledWith({
      logger,
      client,
      type: 'test',
    });
  });

  describe('Product check', () => {
    it('should not skip the product check for the unscoped client', () => {
      const client = configureClient(config, { logger, type: 'test', scoped: false });
      expect(getProductCheckValue(client)).toBe(0);
    });

    it('should skip the product check for the scoped client', () => {
      const client = configureClient(config, { logger, type: 'test', scoped: true });
      expect(getProductCheckValue(client)).toBe(2);
    });

    it('should skip the product check for the children of the scoped client', () => {
      const client = configureClient(config, { logger, type: 'test', scoped: true });
      const asScoped = client.child({ headers: { 'x-custom-header': 'Custom value' } });
      expect(getProductCheckValue(asScoped)).toBe(2);
    });
  });
});
