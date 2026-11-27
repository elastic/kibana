/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac, hkdfSync } from 'crypto';
import { HTTPAuthorizationHeader } from '../authentication';
import {
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
  deriveUiamAttestationKey,
} from './attestation';

const credential = new HTTPAuthorizationHeader('Bearer', 'essu_one');
const key = deriveUiamAttestationKey('a'.repeat(32));

describe('deriveUiamAttestationKey', () => {
  it('derives a 32-byte key', () => {
    expect(key).toHaveLength(32);
  });

  it('is deterministic for the same encryption key', () => {
    expect(deriveUiamAttestationKey('a'.repeat(32)).equals(key)).toBe(true);
  });

  it('differs for different encryption keys', () => {
    expect(deriveUiamAttestationKey('b'.repeat(32)).equals(key)).toBe(false);
  });

  it('never returns the encryption key itself', () => {
    expect(key.toString('utf8')).not.toContain('a'.repeat(32));
  });

  it('matches an independently computed HKDF-SHA256 derivation', () => {
    const expected = Buffer.from(
      hkdfSync(
        'sha256',
        'a'.repeat(32),
        Buffer.alloc(0),
        'kibana-uiam-internal-caller-attestation',
        32
      )
    );
    expect(key.equals(expected)).toBe(true);
  });
});

describe('deriveInternalCallerAttestation', () => {
  it('is deterministic for the same key and credential', () => {
    expect(deriveInternalCallerAttestation(key, credential)).toBe(
      deriveInternalCallerAttestation(key, credential)
    );
  });

  it('differs for different keys', () => {
    expect(deriveInternalCallerAttestation(key, credential)).not.toBe(
      deriveInternalCallerAttestation(deriveUiamAttestationKey('b'.repeat(32)), credential)
    );
  });

  it('differs for different credentials, so it cannot be reused for another one', () => {
    expect(deriveInternalCallerAttestation(key, credential)).not.toBe(
      deriveInternalCallerAttestation(key, new HTTPAuthorizationHeader('Bearer', 'essu_two'))
    );
  });

  it('binds the scheme too, so it cannot be replayed under another one', () => {
    expect(deriveInternalCallerAttestation(key, credential)).not.toBe(
      deriveInternalCallerAttestation(key, new HTTPAuthorizationHeader('ApiKey', 'essu_one'))
    );
  });

  it('never returns the key or the credential itself (non-reversible)', () => {
    const attestation = deriveInternalCallerAttestation(key, credential);
    expect(attestation).not.toContain(key.toString('hex'));
    expect(attestation).not.toContain(credential.credentials);
    // sha256 hex digest is 64 chars.
    expect(attestation).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches an independently computed HMAC over the versioned message and credential', () => {
    const expected = createHmac('sha256', key)
      .update('uiam-internal-caller-attestation-v2|Bearer essu_one')
      .digest('hex');
    expect(deriveInternalCallerAttestation(key, credential)).toBe(expected);
  });

  it('exposes the stable header name', () => {
    expect(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER).toBe('x-kbn-uiam-internal-caller-attestation');
  });
});
