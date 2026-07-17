/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timingSafeEqual } from 'crypto';

import type { Headers } from '@kbn/core-http-server';
import type { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import {
  isUiamCredential,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
} from '@kbn/core-security-server';

/**
 * The credential an Elasticsearch client is being scoped with, plus where it came from, used to
 * decide whether the UIAM shared secret should be attached. See
 * {@link CoreUiamService.getElasticsearchClientAuthentication}.
 */
export type UiamClientAuthenticationParams =
  | {
      /** Kibana minted or stored the credential itself, so nothing has to vouch for it. */
      credentialSource: 'internal';
      /** The credential that will be sent to Elasticsearch. */
      credential: HTTPAuthorizationHeader;
    }
  | {
      /** The credential rode in over HTTP, so the request has to vouch for it. */
      credentialSource: 'inbound';
      /** The credential that will be sent to Elasticsearch. */
      credential: HTTPAuthorizationHeader;
      /**
       * Raw inbound request headers, carrying the attestation that proves an attacker-reachable
       * request nonetheless came from a trusted loopback caller. Nothing in here is trustworthy
       * until the attestation has been verified.
       */
      requestHeaders: Headers;
    };

/**
 * Core's UIAM service
 *
 * @public
 */
export interface CoreUiamService {
  /**
   * Returns the UIAM shared secret to attach as Elasticsearch client authentication (the
   * `x-client-authentication` header for primary credentials, `es-secondary-x-client-authentication`
   * for secondary ones), or `undefined` when nothing should be attached. Encapsulates the
   * internal-vs-external UIAM distinction so the Elasticsearch client stays agnostic of UIAM
   * specifics (the credential prefix, the attestation header, and its verification):
   *
   * - non-UIAM credential -> `undefined`;
   * - internal UIAM credential -> the shared secret;
   * - inbound UIAM credential -> the shared secret only with a valid attestation, proving the
   * loopback caller is trusted.
   */
  getElasticsearchClientAuthentication(params: UiamClientAuthenticationParams): string | undefined;
}

/**
 * Constant-time string comparison used to validate the internal-caller attestation without leaking,
 * via timing, how many leading characters matched. Returns false (no throw) on a length mismatch,
 * so an attacker-controlled value of any length is handled safely.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Builds the core {@link CoreUiamService}. The derived attestation is memoized once per Kibana run
 * (rotating the shared secret restarts Kibana, so it never changes at run time).
 */
export function createCoreUiamService(sharedSecret: string): CoreUiamService {
  let attestation: string | undefined;
  const getAttestation = () => (attestation ??= deriveInternalCallerAttestation(sharedSecret));

  return Object.freeze({
    getElasticsearchClientAuthentication(params: UiamClientAuthenticationParams) {
      if (!isUiamCredential(params.credential)) {
        return;
      }

      if (params.credentialSource === 'inbound') {
        const presented = params.requestHeaders[UIAM_INTERNAL_CALLER_ATTESTATION_HEADER];
        if (typeof presented !== 'string' || !constantTimeEqual(presented, getAttestation())) {
          return;
        }
      }

      return sharedSecret;
    },
  });
}
