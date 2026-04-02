/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InvalidateAPIKeyResult } from '../authentication/api_keys/api_keys';
import { isRevokedApiKey } from './errors';

const createResult = (errorCode?: string): InvalidateAPIKeyResult => ({
  invalidated_api_keys: [],
  previously_invalidated_api_keys: [],
  error_count: errorCode ? 1 : 0,
  ...(errorCode
    ? { error_details: [{ type: 'exception', code: errorCode, reason: 'some error' }] }
    : {}),
});

describe('isRevokedApiKey', () => {
  it('returns true when error code is 0xD38358 (APIKEY_REVOKED)', () => {
    expect(isRevokedApiKey(createResult('0xD38358'))).toBe(true);
  });

  it('returns false for a different error code', () => {
    expect(isRevokedApiKey(createResult('0x28D520'))).toBe(false);
  });

  it('returns false when there are no error details', () => {
    expect(isRevokedApiKey(createResult())).toBe(false);
  });

  it('returns false for generic exception type', () => {
    expect(isRevokedApiKey(createResult('exception'))).toBe(false);
  });
});
