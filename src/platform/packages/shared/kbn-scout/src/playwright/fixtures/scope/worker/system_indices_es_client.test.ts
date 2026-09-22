/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEsClientForTesting } from '@kbn/test-es-server';
import type { EsClient, ScoutLogger, ScoutTestConfig } from './core_fixtures';
import {
  SYSTEM_INDICES_HEADERS,
  createSystemIndicesEsClientFixture,
} from './system_indices_es_client';

jest.mock('@kbn/test-es-server', () => ({
  createEsClientForTesting: jest.fn(),
}));

const createEsClientForTestingMock = createEsClientForTesting as jest.MockedFunction<
  typeof createEsClientForTesting
>;

const noopLogger = {
  serviceLoaded: jest.fn(),
  debug: jest.fn(),
} as unknown as ScoutLogger;

const createConfig = (overrides: Partial<ScoutTestConfig> = {}) =>
  ({
    serverless: false,
    isCloud: false,
    hosts: { elasticsearch: 'http://localhost:9220', kibana: 'http://localhost:5620' },
    auth: { username: 'elastic', password: 'changeme' },
    ...overrides,
  } as ScoutTestConfig);

const createDefaultEsClient = () =>
  ({
    security: { putRole: jest.fn(), putUser: jest.fn() },
  } as unknown as EsClient);

describe('systemIndicesEsClient fixture', () => {
  let childClient: EsClient;
  let privilegedClient: { child: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    childClient = {} as EsClient;
    privilegedClient = {
      child: jest.fn().mockReturnValue(childClient),
      close: jest.fn().mockResolvedValue(undefined),
    };
    createEsClientForTestingMock.mockReturnValue(privilegedClient as unknown as EsClient);
  });

  it('provisions the role and account on stateful, then returns a client that sends the product-origin header', async () => {
    const esClient = createDefaultEsClient();
    const { fixture } = createSystemIndicesEsClientFixture(esClient, createConfig(), noopLogger);

    expect(fixture.isAvailable).toBe(true);
    await expect(fixture.getClient()).resolves.toBe(childClient);

    expect(esClient.security.putRole).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'system_indices_superuser',
        indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
      })
    );
    expect(esClient.security.putUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'system_indices_superuser',
        roles: ['system_indices_superuser'],
      })
    );
    expect(createEsClientForTestingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esUrl: 'http://localhost:9220',
        authOverride: { username: 'system_indices_superuser', password: 'changeme' },
      })
    );
    expect(privilegedClient.child).toHaveBeenCalledWith({ headers: SYSTEM_INDICES_HEADERS });
  });

  it('provisions with the deployment admin password, not a second credential, when it creates the account', async () => {
    const esClient = createDefaultEsClient();
    const { fixture } = createSystemIndicesEsClientFixture(
      esClient,
      createConfig({ isCloud: true, auth: { username: 'elastic', password: 'ech-admin-pw' } }),
      noopLogger
    );

    // ECH: the fixture creates the account itself, so it works there. Reusing the deployment's
    // own admin password keeps the account it leaves behind from being a weaker credential.
    expect(fixture.isAvailable).toBe(true);
    await fixture.getClient();

    expect(esClient.security.putUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'system_indices_superuser', password: 'ech-admin-pw' })
    );
    expect(createEsClientForTestingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authOverride: { username: 'system_indices_superuser', password: 'ech-admin-pw' },
      })
    );
  });

  it('skips provisioning on locally-managed serverless and uses the bind-mounted account password', async () => {
    const esClient = createDefaultEsClient();
    const { fixture } = createSystemIndicesEsClientFixture(
      esClient,
      createConfig({
        serverless: true,
        auth: { username: 'elastic', password: 'not-the-file-realm-password' },
      }),
      noopLogger
    );

    expect(fixture.isAvailable).toBe(true);
    await fixture.getClient();

    expect(esClient.security.putRole).not.toHaveBeenCalled();
    expect(esClient.security.putUser).not.toHaveBeenCalled();
    expect(createEsClientForTestingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authOverride: { username: 'system_indices_superuser', password: 'changeme' },
      })
    );
  });

  it('reports itself unavailable on Cloud serverless and refuses to hand out a client', async () => {
    const esClient = createDefaultEsClient();
    const { fixture } = createSystemIndicesEsClientFixture(
      esClient,
      createConfig({ serverless: true, isCloud: true }),
      noopLogger
    );

    expect(fixture.isAvailable).toBe(false);
    await expect(fixture.getClient()).rejects.toThrow(
      /unavailable on Cloud serverless.*systemIndicesEsClient\.isAvailable/s
    );
    expect(createEsClientForTestingMock).not.toHaveBeenCalled();
  });

  it('provisions once per worker no matter how many callers ask for a client', async () => {
    const esClient = createDefaultEsClient();
    const { fixture } = createSystemIndicesEsClientFixture(esClient, createConfig(), noopLogger);

    await Promise.all([fixture.getClient(), fixture.getClient()]);
    await fixture.getClient();

    expect(esClient.security.putUser).toHaveBeenCalledTimes(1);
    expect(createEsClientForTestingMock).toHaveBeenCalledTimes(1);
  });

  it('closes the client on teardown, and does nothing when no client was ever created', async () => {
    const esClient = createDefaultEsClient();
    const unused = createSystemIndicesEsClientFixture(esClient, createConfig(), noopLogger);

    await unused.teardown();
    expect(privilegedClient.close).not.toHaveBeenCalled();

    const used = createSystemIndicesEsClientFixture(esClient, createConfig(), noopLogger);
    await used.fixture.getClient();
    await used.teardown();

    expect(privilegedClient.close).toHaveBeenCalledTimes(1);
  });

  it('does not let a provisioning failure resurface from teardown', async () => {
    const esClient = createDefaultEsClient();
    (esClient.security.putRole as jest.Mock).mockRejectedValue(new Error('boom'));
    const { fixture, teardown } = createSystemIndicesEsClientFixture(
      esClient,
      createConfig(),
      noopLogger
    );

    await expect(fixture.getClient()).rejects.toThrow('boom');
    await expect(teardown()).resolves.toBeUndefined();
  });
});
