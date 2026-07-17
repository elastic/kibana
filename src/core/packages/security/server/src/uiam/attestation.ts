/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac } from 'crypto';

/**
 * Header a trusted loopback caller stamps on a real HTTP request that carries an internal UIAM
 * (`essu_`) API key, so the ES cluster client can safely re-attach the UIAM shared secret
 * (`x-client-authentication`) on that request's behalf without the caller ever holding the secret
 * itself. The value is an attestation derived from the shared secret (see
 * {@link deriveInternalCallerAttestation}), so it cannot be forged without the secret.
 * It is never forwarded to Elasticsearch.
 */
export const UIAM_INTERNAL_CALLER_ATTESTATION_HEADER = 'x-kbn-uiam-internal-caller-attestation';

/**
 * Fixed message the attestation HMAC is computed over. Versioned so the derivation can evolve
 * without silently accepting attestations minted by an older scheme.
 */
const ATTESTATION_MESSAGE = 'uiam-internal-caller-attestation-v1';

/**
 * Derives the internal-caller attestation from the UIAM shared secret. The result is a
 * non-reversible HMAC (an attacker cannot recover the secret from it, nor mint a valid
 * attestation without the secret), so it can be handed to trusted in-process consumers that
 * need to prove a loopback request is internal without ever seeing the secret.
 *
 * Both the stamping side (consumer, via `coreStart.security.authc.apiKeys.uiam`) and the
 * validating side (`CoreUiamService`, which the ES cluster client delegates to) call this single
 * helper, so the two can never drift.
 */
export function deriveInternalCallerAttestation(sharedSecret: string) {
  return createHmac('sha256', sharedSecret).update(ATTESTATION_MESSAGE).digest('hex');
}
