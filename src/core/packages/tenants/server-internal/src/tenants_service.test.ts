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
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { hapiMocks } from '@kbn/hapi-mocks';
import type { TenantId } from '@kbn/core-tenants-server';
import { readTenantsFile } from './tenants_file';
import { TenantsService } from './tenants_service';

const tenantB = 'project-b' as TenantId;
const tenantC = 'project-c' as TenantId;

const tenantRequest = (tenantId?: TenantId) =>
  kibanaRequestFactory(hapiMocks.createRequest({ app: { tenantId } }));

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
      },
      'project-c': { hosts: ['http://localhost:9202'], serviceAccountToken: 'token-c' },
    });
  });

  it('ignores the tenant header without a tenants file', async () => {
    const { setup } = await setupService();

    expect(setup.enabled).toBe(false);
    expect(setup.getTenantId({ 'x-elastic-tenant-id': 'project-b' })).toBeUndefined();
    expect(readTenantsFile).not.toHaveBeenCalled();
  });

  it('returns the tenant from the header and rejects unknown tenants', async () => {
    const { setup } = await setupService('/tenants.yml');

    expect(readTenantsFile).toHaveBeenCalledWith('/tenants.yml');
    expect(setup.enabled).toBe(true);
    expect(setup.getTenantId({ 'x-elastic-tenant-id': 'project-b' })).toBe(tenantB);
    expect(setup.getTenantId({})).toBeUndefined();
    expect(() => setup.getTenantId({ 'x-elastic-tenant-id': 'project-z' })).toThrow(
      'Unknown tenant [project-z]'
    );
  });

  it('returns the client config without the encryption key', async () => {
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

  it("returns the tenant's crypto only for requests received over HTTP", async () => {
    const { service } = await setupService('/tenants.yml');
    const { getEncryptionCrypto } = service.start();

    const crypto = getEncryptionCrypto(tenantRequest(tenantB));
    const encrypted = await crypto?.encrypt('secret');
    expect(encrypted).toBeDefined();
    await expect(crypto?.decrypt(encrypted ?? '')).resolves.toBe('secret');

    expect(getEncryptionCrypto(tenantRequest(tenantC))).toBeUndefined();
    expect(getEncryptionCrypto(tenantRequest())).toBeUndefined();
    expect(() =>
      getEncryptionCrypto(kibanaRequestFactory({ headers: { 'x-elastic-tenant-id': 'project-b' } }))
    ).toThrow(
      'The encryption key of tenant [project-b] is only available to requests received over HTTP'
    );
  });

  it("returns the tenant's session crypto, separate from its saved objects crypto", async () => {
    const { service } = await setupService('/tenants.yml');
    const { getEncryptionCrypto, getSessionCrypto } = service.start();

    const sessionCrypto = getSessionCrypto(tenantRequest(tenantB));
    const encrypted = await sessionCrypto?.encrypt('session');
    await expect(sessionCrypto?.decrypt(encrypted ?? '')).resolves.toBe('session');
    await expect(
      getEncryptionCrypto(tenantRequest(tenantB))?.decrypt(encrypted ?? '')
    ).rejects.toThrow();

    expect(getSessionCrypto(tenantRequest(tenantC))).toBeUndefined();
    expect(getSessionCrypto(tenantRequest())).toBeUndefined();
    expect(() =>
      getSessionCrypto(kibanaRequestFactory({ headers: { 'x-elastic-tenant-id': 'project-b' } }))
    ).toThrow('only available to requests received over HTTP');
  });
});
