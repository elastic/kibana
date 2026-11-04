/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { TenantId } from '@kbn/core-tenants-server';
import { TenantClients } from './tenant_clients';

const tenantB = 'project-b' as TenantId;
const tenantC = 'project-c' as TenantId;

const clientConfigs: Record<string, { hosts: string[]; username: string; password: string }> = {
  [tenantB]: {
    hosts: ['http://localhost:9201'],
    username: 'kibana_system',
    password: 'changeme-b',
  },
  [tenantC]: {
    hosts: ['http://localhost:9202'],
    username: 'kibana_system',
    password: 'changeme-c',
  },
};

const tenantRequest = (tenantId: TenantId) => ({ headers: {}, tenantId });

const setup = () => {
  const tenants = {
    enabled: true,
    getTenantId: jest.fn(),
    getClientConfig: jest.fn((tenantId: TenantId) => clientConfigs[tenantId]),
  };
  const createClient = jest.fn(() => elasticsearchClientMock.createCustomClusterClient());
  const log = loggingSystemMock.createLogger();
  return { createClient, tenantClients: new TenantClients({ tenants, createClient, log }) };
};

describe('TenantClients', () => {
  it('creates one client per tenant across repeated resolves', () => {
    const { createClient, tenantClients } = setup();

    const client = tenantClients.resolve(tenantRequest(tenantB));
    expect(tenantClients.resolve(tenantRequest(tenantB))).toBe(client);
    tenantClients.resolve(tenantRequest(tenantC));

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledWith(tenantB, clientConfigs[tenantB]);
    expect(createClient).toHaveBeenCalledWith(tenantC, clientConfigs[tenantC]);
  });

  it('closes every cached client', async () => {
    const { createClient, tenantClients } = setup();
    tenantClients.resolve(tenantRequest(tenantB));
    tenantClients.resolve(tenantRequest(tenantC));

    await tenantClients.close();

    for (const { value: client } of createClient.mock.results) {
      expect(client.close).toHaveBeenCalledTimes(1);
    }
  });
});
