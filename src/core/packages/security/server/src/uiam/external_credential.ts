/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Captured when the request is marked, so a later `authorization` swap invalidates the verdict
 * instead of silently carrying it over to a different credential.
 */
interface ExternalCredentialEntry {
  authorization: string | undefined;
}

/**
 * Fake requests whose UIAM (`essu_`) credential is a user-created (external) Cloud API key rather
 * than one Kibana minted. The Elasticsearch cluster client vouches for UIAM credentials on fake
 * requests by attaching the UIAM shared secret (`x-client-authentication`), and UIAM rejects
 * external API keys presented with client authentication.
 *
 * This is deliberately not a request header. The signal never crosses an HTTP boundary, so it must
 * not be serializable, forwardable to Elasticsearch, copyable by header filtering, or suppliable by
 * an inbound request. Keying on the request object itself gives all of that, and the entry dies
 * with the request.
 *
 * Module-level state is safe here: `@kbn/core-security-server` is a server-only package, so there
 * is exactly one module instance per Kibana process.
 */
const externalUiamCredentials = new WeakMap<KibanaRequest, ExternalCredentialEntry>();

const readAuthorization = (request: KibanaRequest): string | undefined =>
  typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;

/**
 * Marks a fake request as carrying a user-created (external) UIAM credential, so the Elasticsearch
 * cluster client does not attach the UIAM shared secret to it. Call it on the request returned by
 * `kibanaRequestFactory()`.
 *
 * Misuse is fail-closed in both directions: marking a Kibana-minted credential merely withholds the
 * shared secret, so that credential fails to authenticate, and marking can never cause the shared
 * secret to be attached.
 */
export function markExternalUiamCredential(request: KibanaRequest): void {
  if (!request.isFakeRequest) {
    throw new Error('markExternalUiamCredential must only be called on a fake request.');
  }

  externalUiamCredentials.set(request, { authorization: readAuthorization(request) });
}

/**
 * Whether the request was marked as carrying a user-created (external) UIAM credential. Anything
 * unmarked, including every real request, is treated as internal (fail closed).
 */
export function isExternalUiamCredential(request: KibanaRequest): boolean {
  const entry = externalUiamCredentials.get(request);
  return entry !== undefined && entry.authorization === readAuthorization(request);
}
