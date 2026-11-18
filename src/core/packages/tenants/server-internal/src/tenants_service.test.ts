/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./tenants_file', () => ({
  readTenantsFile: jest.fn(),
}));

import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { TenantId } from '@kbn/core-tenants-server';
import { readTenantsFile } from './tenants_file';
import { TenantsService } from './tenants_service';

const tenantB = 'project-b' as TenantId;
const tenantC = 'project-c' as TenantId;

const setupService = async (file?: string) => {
  const configService = configServiceMock.create({ atPath: { file } });
  const service = new TenantsService(mockCoreContext.create({ configService }));
  return { service, setup: await service.setup() };
};

describe('TenantsService', () => {
  beforeEach(() => {
    jest.mocked(readTenantsFile).mockResolvedValue({
      'project-b': {
        hosts: ['http://localhost:9201'],
        username: 'kibana_system',
        password: 'changeme-b',
        encryptionKey: 'b'.repeat(32),
        securityEncryptionKey: 'B'.repeat(32),
        projectName: 'Project B',
      },
      'project-c': {
        hosts: ['http://localhost:9202'],
        serviceAccountToken: 'token-c',
        encryptionKey: 'c'.repeat(32),
        securityEncryptionKey: 'C'.repeat(32),
      },
    });
  });

  it('ignores the tenant header without a tenants file', async () => {
    const { setup } = await setupService();

    expect(setup.enabled).toBe(false);
    expect(setup.getTenantId({ 'x-elastic-project-id': 'project-b' })).toBeUndefined();
    expect(readTenantsFile).not.toHaveBeenCalled();
  });

  it('returns the tenant from the header and rejects unknown tenants', async () => {
    const { setup } = await setupService('/tenants.yml');

    expect(readTenantsFile).toHaveBeenCalledWith('/tenants.yml');
    expect(setup.enabled).toBe(true);
    expect(setup.getTenantId({ 'x-elastic-project-id': 'project-b' })).toBe(tenantB);
    expect(setup.getTenantId({})).toBeUndefined();
    expect(() => setup.getTenantId({ 'x-elastic-project-id': 'project-z' })).toThrow(
      'Unknown tenant [project-z]'
    );
  });

  it('resolves stored tenant IDs and rejects unknown tenants', async () => {
    const { setup } = await setupService('/tenants.yml');

    expect(setup.resolve('project-b')).toBe(tenantB);
    expect(() => setup.resolve('project-z')).toThrow('Unknown tenant [project-z]');
  });

  it('returns the client config without the encryption keys', async () => {
    const { setup } = await setupService('/tenants.yml');

    expect(setup.getClientConfig(tenantB)).toEqual({
      hosts: ['http://localhost:9201'],
      username: 'kibana_system',
      password: 'changeme-b',
    });
    expect(setup.getClientConfig(tenantC)).toEqual({
      hosts: ['http://localhost:9202'],
      serviceAccountToken: 'token-c',
    });
  });

  it("returns the tenant's project name, if it has one", async () => {
    const { setup } = await setupService('/tenants.yml');

    expect(setup.getProjectName(tenantB)).toBe('Project B');
    expect(setup.getProjectName(tenantC)).toBeUndefined();
  });

  it("returns each tenant's own saved objects crypto", async () => {
    const { service } = await setupService('/tenants.yml');
    const { getEncryptionCrypto } = service.start();

    const encrypted = await getEncryptionCrypto(tenantB).encrypt('secret');
    await expect(getEncryptionCrypto(tenantB).decrypt(encrypted)).resolves.toBe('secret');
    await expect(getEncryptionCrypto(tenantC).decrypt(encrypted)).rejects.toThrow();
  });

  it("returns the tenant's session crypto, separate from its saved objects crypto", async () => {
    const { service } = await setupService('/tenants.yml');
    const { getEncryptionCrypto, getSessionCrypto } = service.start();

    const encrypted = await getSessionCrypto(tenantB).encrypt('session');
    await expect(getSessionCrypto(tenantB).decrypt(encrypted)).resolves.toBe('session');
    await expect(getEncryptionCrypto(tenantB).decrypt(encrypted)).rejects.toThrow();
  });
});
