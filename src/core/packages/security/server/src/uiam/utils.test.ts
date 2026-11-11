/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isUiamBearerCredential, isUiamCredential } from './utils';
import { HTTPAuthorizationHeader } from '../authentication';

describe('#isUiamCredential()', () => {
  it('returns `true` when credential is a valid UIAM credential', () => {
    for (const credential of ['essu_credential_123', 'essu_dev_credential_123']) {
      expect(isUiamCredential(new HTTPAuthorizationHeader('ApiKey', credential))).toBe(true);
      expect(isUiamCredential(credential)).toBe(true);
    }
  });

  it('returns `false` when credential is NOT a valid UIAM credential', () => {
    for (const credential of [
      'ess_credential_123',
      'regular_credential_123',
      '_essu_credential_123',
      '',
    ]) {
      expect(isUiamCredential(new HTTPAuthorizationHeader('ApiKey', credential))).toBe(false);
      expect(isUiamCredential(credential)).toBe(false);
    }
  });
});

describe('#isUiamBearerCredential()', () => {
  it('returns `true` for a UIAM credential with the `Bearer` scheme, regardless of casing', () => {
    for (const scheme of ['Bearer', 'bearer', 'BEARER']) {
      expect(isUiamBearerCredential(new HTTPAuthorizationHeader(scheme, 'essu_token_123'))).toBe(
        true
      );
    }
  });

  it('returns `false` for a UIAM credential with a non-`Bearer` scheme', () => {
    expect(isUiamBearerCredential(new HTTPAuthorizationHeader('ApiKey', 'essu_key_123'))).toBe(
      false
    );
  });

  it('returns `false` for a non-UIAM credential with the `Bearer` scheme', () => {
    expect(isUiamBearerCredential(new HTTPAuthorizationHeader('Bearer', 'regular_token'))).toBe(
      false
    );
  });
});
