/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreStart, CurrentUser } from '@kbn/core-di-browser';
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { loadSecurity } from './security';

describe('loadSecurity', () => {
  let container: Container;
  let security: ReturnType<typeof securityServiceMock.createStart>;

  beforeEach(() => {
    security = securityServiceMock.createStart();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadSecurity));
    container.bind(CoreStart('security')).toConstantValue(security);
  });

  it('should resolve the current user', async () => {
    const user = securityServiceMock.createMockAuthenticatedUser();
    security.authc.getCurrentUser.mockResolvedValue(user);

    await expect(container.getAsync(CurrentUser)).resolves.toBe(user);
  });

  it('should cache the current user in the scope', async () => {
    const user = securityServiceMock.createMockAuthenticatedUser();
    security.authc.getCurrentUser.mockResolvedValue(user);

    await expect(container.getAsync(CurrentUser)).resolves.toBe(user);
    await expect(container.getAsync(CurrentUser)).resolves.toBe(user);

    expect(security.authc.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
