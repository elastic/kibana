/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';

import type {
  UiamClientAuthenticationContext,
  UiamClientAuthenticationParams,
} from '@kbn/core-security-server';
import {
  createUiamAssertionSigner,
  deriveUiamAttestationKey,
  resolveUiamClientAuthentication,
} from '@kbn/core-security-server';

/**
 * Builds the {@link UiamClientAuthenticationContext} from the raw `xpack.security` config: the
 * assertion signer from Kibana's UIAM client certificate and key, and the attestation key from
 * `xpack.security.encryptionKey`.
 */
export function createUiamClientAuthenticationContext({
  encryptionKey,
  uiam,
}: {
  encryptionKey?: string;
  uiam: { ssl?: { certificate?: string; key?: string } };
}): UiamClientAuthenticationContext {
  const certificatePath = uiam.ssl?.certificate;
  const keyPath = uiam.ssl?.key;
  if (!certificatePath || !keyPath) {
    throw new Error(
      '[xpack.security.uiam.ssl.certificate] and [xpack.security.uiam.ssl.key] must be set when UIAM is enabled.'
    );
  }

  if (!encryptionKey) {
    throw new Error('[xpack.security.encryptionKey] must be set explicitly when UIAM is enabled.');
  }

  return {
    signer: createUiamAssertionSigner({
      certificate: readFileSync(certificatePath, 'utf8'),
      key: readFileSync(keyPath, 'utf8'),
    }),
    attestationKey: deriveUiamAttestationKey(encryptionKey),
  };
}

/**
 * Core's UIAM service
 *
 * @public
 */
export interface CoreUiamService {
  /**
   * Returns the client authentication to attach for Elasticsearch (the `x-client-authentication`
   * header for primary credentials, `es-secondary-x-client-authentication` for secondary ones),
   * or `undefined` when nothing should be attached. Encapsulates the internal-vs-external UIAM
   * distinction so the Elasticsearch client stays agnostic of UIAM specifics (the credential
   * prefix, the assertion, the attestation header, and its verification):
   *
   * - non-UIAM credential -> `undefined`;
   * - internal UIAM credential -> Kibana's signed assertion for the credential;
   * - external (user-created) UIAM credential -> `undefined`, UIAM rejects external API keys
   * presented with client authentication;
   * - inbound UIAM credential -> the relayed client authentication when there is one, even if
   * empty; otherwise Kibana's signed assertion only with a valid attestation, proving the
   * loopback caller is trusted.
   */
  getElasticsearchClientAuthentication(
    params: UiamClientAuthenticationParams
  ): string | string[] | undefined;
}

/** Builds the core {@link CoreUiamService}. */
export function createCoreUiamService(context: UiamClientAuthenticationContext): CoreUiamService {
  return Object.freeze({
    getElasticsearchClientAuthentication: (params: UiamClientAuthenticationParams) =>
      resolveUiamClientAuthentication(context, params),
  });
}
