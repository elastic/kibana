/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuditLogger } from '@kbn/core-security-server';

export type MockedAuditLogger = jest.Mocked<AuditLogger>;

export const auditLoggerMock = {
  create(): MockedAuditLogger {
    return {
      log: jest.fn(),
      enabled: true,
    };
  },
};

export interface MockedAuditService {
  asScoped: (request: KibanaRequest) => MockedAuditLogger;
  withoutRequest: MockedAuditLogger;
}

export const auditServiceMock = {
  create(): MockedAuditService {
    return {
      asScoped: jest.fn().mockReturnValue(auditLoggerMock.create()),
      withoutRequest: auditLoggerMock.create(),
    };
  },
};
