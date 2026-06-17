/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSecurityDelegateContract } from '@kbn/core-security-browser';
import { convertSecurityApi } from './convert_security_api';

describe('convertSecurityApi', () => {
  it('returns the API from the source', () => {
    const source: CoreSecurityDelegateContract = { authc: { getCurrentUser: jest.fn() } };
    const output = convertSecurityApi(source);
    expect(output.authc.getCurrentUser).toBe(source.authc.getCurrentUser);
  });
});
