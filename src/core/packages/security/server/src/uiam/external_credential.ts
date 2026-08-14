/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Header a consumer stamps on a fake request whose UIAM (`essu_`) credential is a user-created
 * (external) Cloud API key rather than one minted by Kibana. The Elasticsearch cluster client
 * normally vouches for UIAM credentials on fake requests by attaching the UIAM shared secret
 * (`x-client-authentication`), but UIAM rejects external API keys presented with client
 * authentication, so this marker tells the client to skip it. It is only ever consulted for
 * fake requests and is never forwarded to Elasticsearch.
 *
 * Misuse is fail-closed in both directions: stamping it on a Kibana-minted credential merely
 * makes that credential fail authentication (the shared secret is withheld), and it can never
 * cause the shared secret to be attached.
 */
export const UIAM_EXTERNAL_CREDENTIAL_HEADER = 'x-kbn-uiam-external-credential';

/**
 * Returns headers marking a fake request's UIAM credential as user-created (external), so the
 * Elasticsearch cluster client does not attach the UIAM shared secret to it. Spread into the
 * fake request's headers next to the `authorization` header.
 */
export function getExternalUiamCredentialHeaders(): Record<string, string> {
  return { [UIAM_EXTERNAL_CREDENTIAL_HEADER]: 'true' };
}
