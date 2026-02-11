/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import { convertSecurityApi } from './convert_security_api';
import { createAuditLoggerMock } from '../test_helpers/create_audit_logger.mock';

describe('convertSecurityApi', () => {
  it('returns the API from the source', () => {
    const source: CoreSecurityDelegateContract = {
      authc: {
        getCurrentUser: jest.fn(),
        apiKeys: {
          areAPIKeysEnabled: jest.fn(),
          areCrossClusterAPIKeysEnabled: jest.fn(),
          validate: jest.fn(),
          invalidate: jest.fn(),
          invalidateAsInternalUser: jest.fn(),
          grantAsInternalUser: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          uiam: {
            grant: jest.fn(),
            invalidate: jest.fn(),
          },
        },
      },
      audit: {
        asScoped: jest.fn().mockReturnValue(createAuditLoggerMock.create()),
        withoutRequest: createAuditLoggerMock.create(),
      },
    };
    const output = convertSecurityApi(source);
    expect(output.authc.getCurrentUser).toBe(source.authc.getCurrentUser);
    expect(output.authc.apiKeys).toBe(source.authc.apiKeys);
    expect(output.audit.asScoped).toBe(source.audit.asScoped);
    expect(output.audit.withoutRequest).toBe(source.audit.withoutRequest);
  });
});
