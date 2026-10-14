/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac } from 'crypto';
import { HTTPAuthorizationHeader } from '../authentication';
import {
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
} from './attestation';

const credential = new HTTPAuthorizationHeader('Bearer', 'essu_one');

describe('deriveInternalCallerAttestation', () => {
  it('is deterministic for the same secret and credential', () => {
    expect(deriveInternalCallerAttestation('secret', credential)).toBe(
      deriveInternalCallerAttestation('secret', credential)
    );
  });

  it('differs for different secrets', () => {
    expect(deriveInternalCallerAttestation('secret-a', credential)).not.toBe(
      deriveInternalCallerAttestation('secret-b', credential)
    );
  });

  it('differs for different credentials, so it cannot be reused for another one', () => {
    expect(deriveInternalCallerAttestation('secret', credential)).not.toBe(
      deriveInternalCallerAttestation('secret', new HTTPAuthorizationHeader('Bearer', 'essu_two'))
    );
  });

  it('binds the scheme too, so it cannot be replayed under another one', () => {
    expect(deriveInternalCallerAttestation('secret', credential)).not.toBe(
      deriveInternalCallerAttestation('secret', new HTTPAuthorizationHeader('ApiKey', 'essu_one'))
    );
  });

  it('never returns the secret or the credential itself (non-reversible)', () => {
    const secret = 'super-secret-value';
    const attestation = deriveInternalCallerAttestation(secret, credential);
    expect(attestation).not.toBe(secret);
    expect(attestation).not.toContain(secret);
    expect(attestation).not.toContain(credential.credentials);
    // sha256 hex digest is 64 chars.
    expect(attestation).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches an independently computed HMAC over the versioned message and credential', () => {
    const secret = 'shared-secret';
    const expected = createHmac('sha256', secret)
      .update('uiam-internal-caller-attestation-v1|Bearer essu_one')
      .digest('hex');
    expect(deriveInternalCallerAttestation(secret, credential)).toBe(expected);
  });

  it('exposes the stable header name', () => {
    expect(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER).toBe('x-kbn-uiam-internal-caller-attestation');
  });
});
