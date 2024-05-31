/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import { convertSecurityApi } from './convert_security_api';
import { createAuditLoggerMock } from '../test_helpers/create_audit_logger.mock';

describe('convertSecurityApi', () => {
  it('returns the API from the source', () => {
    const source: CoreSecurityDelegateContract = {
      authc: {
        getCurrentUser: jest.fn(),
      },
      audit: {
        asScoped: jest.fn().mockReturnValue(createAuditLoggerMock.create()),
        withoutRequest: createAuditLoggerMock.create(),
      },
    };
    const output = convertSecurityApi(source);
    expect(output.authc.getCurrentUser).toBe(source.authc.getCurrentUser);
    expect(output.audit.asScoped).toBe(source.audit.asScoped);
    expect(output.audit.withoutRequest).toBe(source.audit.withoutRequest);
  });
});
