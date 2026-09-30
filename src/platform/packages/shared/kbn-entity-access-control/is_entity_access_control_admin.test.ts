/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { isEntityAccessControlAdmin } from './is_entity_access_control_admin';

describe('isEntityAccessControlAdmin', () => {
  const core = {
    security: securityServiceMock.createStart(),
    elasticsearch: elasticsearchServiceMock.createStart(),
  };
  const request = httpServerMock.createKibanaRequest();
  const hasPrivileges = core.elasticsearch.client.asScoped().asCurrentUser.security.hasPrivileges;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(core.security.authc, 'getCurrentUser')
      .mockReturnValue(securityServiceMock.createMockAuthenticatedUser());
  });

  it.each<[string, boolean]>([
    ['superuser', true],
    ['admin', true],
    ['custom-wildcard-role', true],
    ['workflows-all', false],
    ['admin', false],
  ])('uses privileges, not the role name (%s, %s)', async (role, allowed) => {
    jest
      .spyOn(core.security.authc, 'getCurrentUser')
      .mockReturnValue(securityServiceMock.createMockAuthenticatedUser({ roles: [role] }));
    hasPrivileges.mockResolvedValue({
      has_all_requested: allowed,
      username: 'user',
      application: {},
      cluster: {},
      index: {},
    });
    await expect(isEntityAccessControlAdmin(core, request)).resolves.toBe(allowed);
    expect(hasPrivileges).toHaveBeenCalledWith({
      application: [
        {
          application: 'kibana-.kibana',
          resources: ['*'],
          privileges: ['entity_access_control:admin'],
        },
      ],
    });
  });

  it('does not grant an override without a request', async () => {
    await expect(isEntityAccessControlAdmin(core)).resolves.toBe(false);
    expect(hasPrivileges).not.toHaveBeenCalled();
  });

  it('does not grant an override without an authenticated user', async () => {
    jest.spyOn(core.security.authc, 'getCurrentUser').mockReturnValue(null);
    await expect(isEntityAccessControlAdmin(core, request)).resolves.toBe(false);
    expect(hasPrivileges).not.toHaveBeenCalled();
  });

  it('does not grant API keys an override', async () => {
    jest.spyOn(core.security.authc, 'getCurrentUser').mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser({
        roles: ['superuser'],
        authentication_type: 'api_key',
      })
    );
    await expect(isEntityAccessControlAdmin(core, request)).resolves.toBe(false);
    expect(hasPrivileges).not.toHaveBeenCalled();
  });

  it('denies the override when privilege lookup fails', async () => {
    hasPrivileges.mockRejectedValue(new Error('unavailable'));
    await expect(isEntityAccessControlAdmin(core, request)).resolves.toBe(false);
  });
});
