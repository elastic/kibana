/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiamClientAuthenticationParams } from '@kbn/core-security-server';
import { resolveUiamClientAuthentication } from '@kbn/core-security-server';

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
   * - external (user-created) UIAM credential -> `undefined`, UIAM rejects external API keys
   * presented with client authentication;
   * - inbound UIAM credential -> the relayed client authentication when there is one, even if
   * empty; otherwise the shared secret only with a valid attestation, proving the loopback caller
   * is trusted.
   */
  getElasticsearchClientAuthentication(
    params: UiamClientAuthenticationParams
  ): string | string[] | undefined;
}

/** Builds the core {@link CoreUiamService}. */
export function createCoreUiamService(sharedSecret: string): CoreUiamService {
  return Object.freeze({
    getElasticsearchClientAuthentication: (params: UiamClientAuthenticationParams) =>
      resolveUiamClientAuthentication(sharedSecret, params),
  });
}
