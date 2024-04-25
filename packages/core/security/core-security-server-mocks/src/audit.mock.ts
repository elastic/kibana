/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AuditLogger, CoreAuditService } from '@kbn/core/server';

export const auditLoggerMock = {
  create() {
    return {
      log: jest.fn(),
      enabled: true,
    } as jest.Mocked<AuditLogger>;
  },
};

export const auditServiceMock = {
  create() {
    return {
      // getLogger: jest.fn(),
      asScoped: jest.fn().mockReturnValue(auditLoggerMock.create()),
      withoutRequest: auditLoggerMock.create(),
    } as jest.Mocked<CoreAuditService>;
  },
};
