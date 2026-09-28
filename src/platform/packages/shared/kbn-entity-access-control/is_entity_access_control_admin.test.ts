/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
import { isEntityAccessControlAdmin } from './is_entity_access_control_admin';

describe('isEntityAccessControlAdmin', () => {
  const request = httpServerMock.createKibanaRequest();

  it.each([
    [['superuser'], true],
    [['other-role', 'superuser'], true],
    [['system_indices_superuser'], false],
    [['admin'], false],
    [[], false],
  ] as const)('checks the exact role in %j', (roles, expected) => {
    const core = coreMock.createStart();
    jest
      .spyOn(core.security.authc, 'getCurrentUser')
      .mockReturnValue(securityServiceMock.createMockAuthenticatedUser({ roles: [...roles] }));
    expect(isEntityAccessControlAdmin(core, request)).toBe(expected);
    expect(core.security.authc.getCurrentUser).toHaveBeenCalledWith(request);
    expect(core.elasticsearch.client.asScoped).not.toHaveBeenCalled();
  });

  it('does not grant an override without a request', () => {
    const core = coreMock.createStart();
    expect(isEntityAccessControlAdmin(core)).toBe(false);
    expect(core.security.authc.getCurrentUser).not.toHaveBeenCalled();
  });

  it('does not grant an override without an authenticated user', () => {
    const core = coreMock.createStart();
    jest.spyOn(core.security.authc, 'getCurrentUser').mockReturnValue(null);
    expect(isEntityAccessControlAdmin(core, request)).toBe(false);
  });

  it('does not grant API keys a user-role override', () => {
    const core = coreMock.createStart();
    jest.spyOn(core.security.authc, 'getCurrentUser').mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser({
        roles: ['superuser'],
        authentication_type: 'api_key',
      })
    );
    expect(isEntityAccessControlAdmin(core, request)).toBe(false);
  });
});
