/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac, hkdfSync } from 'crypto';

import type { HTTPAuthorizationHeader } from '../authentication';

/**
 * Header a trusted loopback caller stamps on a real HTTP request that carries an internal UIAM
 * (`essu_`) API key, so the ES cluster client can safely attach Kibana's own client
 * authentication (`x-client-authentication`) on that request's behalf without the caller ever
 * holding the means to produce it. The value is an attestation derived from a key only Kibana
 * holds (see {@link deriveInternalCallerAttestation}), so it cannot be forged without that key.
 * It is never forwarded to Elasticsearch.
 */
export const UIAM_INTERNAL_CALLER_ATTESTATION_HEADER = 'x-kbn-uiam-internal-caller-attestation';

export const ES_CLIENT_AUTHENTICATION_HEADER = 'x-client-authentication';

/**
 * Fixed prefix the attestation HMAC is computed over, before the credential it is bound to.
 * Versioned so the derivation can evolve without silently accepting attestations minted by an
 * older scheme.
 */
const ATTESTATION_MESSAGE_PREFIX = 'uiam-internal-caller-attestation-v2|';

const ATTESTATION_KEY_INFO = 'kibana-uiam-internal-caller-attestation';
const ATTESTATION_KEY_LENGTH = 32;

/**
 * Derives the internal-caller attestation key from `xpack.security.encryptionKey`. Every Kibana
 * node shares the encryption key, so every node derives the same attestation key.
 */
export function deriveUiamAttestationKey(encryptionKey: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', encryptionKey, Buffer.alloc(0), ATTESTATION_KEY_INFO, ATTESTATION_KEY_LENGTH)
  );
}

/**
 * Derives the internal-caller attestation from the attestation key (see
 * {@link deriveUiamAttestationKey}), bound to the credential it will travel with. The result is a
 * non-reversible HMAC (an attacker cannot recover the key from it, nor mint a valid attestation
 * without the key), so it can be handed to trusted in-process consumers that need to prove a
 * loopback request is internal without ever seeing the key.
 *
 * Binding to the credential is what keeps a leaked attestation from being reusable: it only
 * authorizes the one credential it was minted for, so its usefulness is bounded by that
 * credential's own lifetime instead of the key's. The whole serialized header (scheme included)
 * goes into the HMAC, so an attestation minted for `Bearer essu_x` cannot be replayed as
 * `ApiKey essu_x`.
 *
 * Both the stamping side (consumer, via `coreStart.security.authc.apiKeys.uiam`) and the
 * validating side (`CoreUiamService`, which the ES cluster client delegates to) call this single
 * helper, so the two can never drift.
 */
export function deriveInternalCallerAttestation(
  attestationKey: Buffer,
  credential: HTTPAuthorizationHeader
) {
  return createHmac('sha256', attestationKey)
    .update(`${ATTESTATION_MESSAGE_PREFIX}${credential.toString()}`)
    .digest('hex');
}
