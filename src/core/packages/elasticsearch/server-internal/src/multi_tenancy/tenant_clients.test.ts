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
import { TenantClients } from './tenant_clients';

const tenants = {
  'project-b': {
    hosts: ['http://localhost:9201'],
    username: 'kibana_system',
    password: 'changeme-b',
  },
  'project-c': {
    hosts: ['http://localhost:9202'],
    username: 'kibana_system',
    password: 'changeme-c',
  },
};

const projectRequest = (projectId: string) => ({ headers: {}, projectId });

const setup = () => {
  const createClient = jest.fn(() => elasticsearchClientMock.createCustomClusterClient());
  const log = loggingSystemMock.createLogger();
  return { createClient, log, tenantClients: new TenantClients({ tenants, createClient, log }) };
};

describe('TenantClients', () => {
  it('creates one client per project across repeated resolves', () => {
    const { createClient, tenantClients } = setup();

    const client = tenantClients.resolve(projectRequest('project-b'));
    expect(tenantClients.resolve(projectRequest('project-b'))).toBe(client);
    tenantClients.resolve(projectRequest('project-c'));

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledWith('project-b', tenants['project-b']);
    expect(createClient).toHaveBeenCalledWith('project-c', tenants['project-c']);
  });

  it('closes every cached client', async () => {
    const { createClient, tenantClients } = setup();
    tenantClients.resolve(projectRequest('project-b'));
    tenantClients.resolve(projectRequest('project-c'));

    await tenantClients.close();

    for (const { value: client } of createClient.mock.results) {
      expect(client.close).toHaveBeenCalledTimes(1);
    }
  });
});
