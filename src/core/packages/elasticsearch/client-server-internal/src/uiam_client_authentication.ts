/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Headers } from '@kbn/core-http-server';
import type { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { CoreUiamService } from '@kbn/core-security-server-internal';

import { ES_CLIENT_AUTHENTICATION_HEADER } from './headers';

export interface ResolveUiamClientAuthenticationParams {
  /** Core's UIAM service, absent outside UIAM-enabled serverless. */
  uiam: CoreUiamService | null | undefined;
  /** The credential that will be sent, parsed by the caller off {@link effectiveHeaders}. */
  credential: HTTPAuthorizationHeader | null;
  /**
   * The headers the credential was taken from, which for a real request means the whitelisted wire
   * headers overlaid by the authentication provider's output. Read only for whether client
   * authentication has already been resolved.
   */
  effectiveHeaders: Headers;
  /**
   * Raw, unfiltered inbound headers to verify an internal-caller attestation against, or
   * `undefined` to treat the credential as one Kibana already vouches for.
   *
   * The attestation is deliberately absent from `requestHeadersWhitelist`, so it never reaches
   * Elasticsearch and has to be read from the raw headers rather than the effective ones.
   *
   * The two callers answer this differently, and the difference is the point. The primary path
   * builds its headers from the wire, so a real request's credential is only as trustworthy as the
   * attestation riding with it. The secondary path builds them from the authentication provider's
   * output alone, so the credential has already been through `_authenticate` and needs no
   * attestation. Pass `undefined` for a fake request either way: Kibana minted that credential.
   */
  attestationHeaders: Headers | undefined;
  /** Whether a fake request was marked as carrying a user-created (external) UIAM credential. */
  isExternalCredential: boolean;
}

/**
 * Decides the UIAM client authentication to send to Elasticsearch alongside `credential`, or
 * `undefined` to send none.
 *
 * Both of the cluster client's header builders go through here. They used to each carry their own
 * copy of the rule, which is how they came to disagree.
 */
export const resolveUiamClientAuthentication = ({
  uiam,
  credential,
  effectiveHeaders,
  attestationHeaders,
  isExternalCredential,
}: ResolveUiamClientAuthenticationParams): string | string[] | undefined => {
  if (!uiam || !credential) {
    return undefined;
  }

  // Whatever already resolved the client authentication speaks for this credential: a secret
  // relayed from the upstream caller, or one an authentication provider chose for the credential
  // it produced. Kibana never substitutes its own, because the token may be bound to another
  // client. Presence decides rather than truthiness, so an upstream that deliberately sent an
  // empty value is still the one speaking.
  const resolved = effectiveHeaders[ES_CLIENT_AUTHENTICATION_HEADER];
  if (resolved !== undefined) {
    return resolved;
  }

  if (attestationHeaders !== undefined) {
    // Nothing resolved it, so the only thing that can vouch for the credential is an attestation
    // Kibana itself could have produced. An upstream caller cannot mint one without the shared
    // secret, which is what separates a Kibana loopback call from a relayed token.
    return uiam.getElasticsearchClientAuthentication({
      credentialSource: 'inbound',
      credential,
      requestHeaders: attestationHeaders,
    });
  }

  return uiam.getElasticsearchClientAuthentication({
    credentialSource: isExternalCredential ? 'external' : 'internal',
    credential,
  });
};
