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
import {
  AuditLogger,
  CoreStart,
  CurrentUser,
  RedactedSessionId,
  Request,
} from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { auditLoggerMock, securityServiceMock } from '@kbn/core-security-server-mocks';
import { loadSecurity } from './security';

describe('loadSecurity', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let security: ReturnType<typeof securityServiceMock.createStart>;
  let auditLogger: ReturnType<typeof auditLoggerMock.create>;
  let user: AuthenticatedUser;
  let request: KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    injection = injectionServiceMock.createStartContract();
    auditLogger = auditLoggerMock.create();
    user = securityServiceMock.createMockAuthenticatedUser();
    security = securityServiceMock.createStart();
    jest.mocked(security.audit.asScoped).mockReturnValue(auditLogger);
    security.authc.getCurrentUser.mockReturnValue(user);
    request = httpServerMock.createKibanaRequest();
    container = injection.getContainer();
    container.load(new ContainerModule(loadSecurity));
    container.bind(CoreStart('security')).toConstantValue(security);
    container.bind(Request).toConstantValue(request);
  });

  it('should resolve the audit logger scoped to the current request', () => {
    expect(container.get(AuditLogger)).toBe(auditLogger);
    expect(security.audit.asScoped).toHaveBeenCalledWith(request);
  });

  it('should create the audit logger only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(AuditLogger)).toBe(auditLogger);
    expect(fork.get(AuditLogger)).toBe(auditLogger);
    expect(security.audit.asScoped).toHaveBeenCalledTimes(1);
  });

  it('should resolve the current user', () => {
    expect(container.get(CurrentUser)).toBe(user);
    expect(security.authc.getCurrentUser).toHaveBeenCalledWith(request);
  });

  it('should resolve null for unauthenticated requests', () => {
    jest.mocked(security.authc.getCurrentUser).mockReturnValue(null);

    expect(container.get(CurrentUser)).toBeNull();
  });

  it('should retrieve the current user only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(CurrentUser)).toBe(user);
    expect(fork.get(CurrentUser)).toBe(user);
    expect(security.authc.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('should resolve the redacted session id', async () => {
    security.authc.getRedactedSessionId.mockResolvedValue('redacted-id');

    await expect(container.getAsync(RedactedSessionId)).resolves.toBe('redacted-id');
    expect(security.authc.getRedactedSessionId).toHaveBeenCalledWith(request);
  });

  it('should retrieve the redacted session id only once per scope', async () => {
    const fork = injection.fork();
    security.authc.getRedactedSessionId.mockResolvedValue('redacted-id');

    await expect(fork.getAsync(RedactedSessionId)).resolves.toBe('redacted-id');
    await expect(fork.getAsync(RedactedSessionId)).resolves.toBe('redacted-id');

    expect(security.authc.getRedactedSessionId).toHaveBeenCalledTimes(1);
  });
});
