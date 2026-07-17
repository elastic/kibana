/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac } from 'crypto';
import {
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
} from './attestation';

describe('deriveInternalCallerAttestation', () => {
  it('is deterministic for the same secret', () => {
    expect(deriveInternalCallerAttestation('secret')).toBe(
      deriveInternalCallerAttestation('secret')
    );
  });

  it('differs for different secrets', () => {
    expect(deriveInternalCallerAttestation('secret-a')).not.toBe(
      deriveInternalCallerAttestation('secret-b')
    );
  });

  it('never returns the secret itself (non-reversible)', () => {
    const secret = 'super-secret-value';
    const attestation = deriveInternalCallerAttestation(secret);
    expect(attestation).not.toBe(secret);
    expect(attestation).not.toContain(secret);
    // sha256 hex digest is 64 chars.
    expect(attestation).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches an independently computed HMAC over the versioned message', () => {
    const secret = 'shared-secret';
    const expected = createHmac('sha256', secret)
      .update('uiam-internal-caller-attestation-v1')
      .digest('hex');
    expect(deriveInternalCallerAttestation(secret)).toBe(expected);
  });

  it('exposes the stable header name', () => {
    expect(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER).toBe('x-kbn-uiam-internal-caller-attestation');
  });
});
