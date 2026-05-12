/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

// Accepted PEM markers. Private keys may be PKCS#1 ("RSA PRIVATE KEY"),
// PKCS#8 ("PRIVATE KEY"), or encrypted PKCS#8 ("ENCRYPTED PRIVATE KEY").
const CERTIFICATE_MARKER = /-----BEGIN CERTIFICATE-----/;
const PRIVATE_KEY_MARKER = /-----BEGIN (?:RSA |ENCRYPTED )?PRIVATE KEY-----/;

/**
 * Raised by `OAuthEntraClientCertificate.configure` for any failure in the
 * Entra cert auth flow. The `kind` discriminator separates user-fixable
 * configuration issues (`'assertion'`: malformed PEM, wrong passphrase, etc.)
 * from transport/authorization failures (`'exchange'`: token endpoint
 * rejected the assertion, network error, non-2xx response).
 */
export class EntraAuthError extends Error {
  public readonly kind: 'assertion' | 'exchange';
  constructor(kind: 'assertion' | 'exchange', message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EntraAuthError';
    this.kind = kind;
  }
}

const authSchema = lazySchema(() =>
  z
    .object({
      tokenUrl: z
        .url()
        .meta({ label: i18n.OAUTH_TOKEN_URL_LABEL, validate: { allowedHosts: true } }),
      clientId: z
        .string()
        .min(1, { message: i18n.OAUTH_CLIENT_ID_REQUIRED_MESSAGE })
        .meta({ label: i18n.OAUTH_CLIENT_ID_LABEL }),
      scope: z.string().meta({ label: i18n.OAUTH_SCOPE_LABEL }).optional(),
      certificate: z
        .string()
        .min(1, { message: i18n.OAUTH_CERT_CERTIFICATE_REQUIRED_MESSAGE })
        .refine((v) => CERTIFICATE_MARKER.test(v), {
          message: i18n.OAUTH_CERT_CERTIFICATE_INVALID_PEM_MESSAGE,
        })
        .meta({ label: i18n.OAUTH_CERT_CERTIFICATE_LABEL, widget: 'textarea' }),
      privateKey: z
        .string()
        .min(1, { message: i18n.OAUTH_CERT_PRIVATE_KEY_REQUIRED_MESSAGE })
        .refine((v) => PRIVATE_KEY_MARKER.test(v), {
          message: i18n.OAUTH_CERT_PRIVATE_KEY_INVALID_PEM_MESSAGE,
        })
        .meta({
          label: i18n.OAUTH_CERT_PRIVATE_KEY_LABEL,
          sensitive: true,
          widget: 'secretTextarea',
        }),
      passphrase: z
        .string()
        .meta({ label: i18n.OAUTH_CERT_PASSPHRASE_LABEL, sensitive: true })
        .optional(),
    })
    .meta({ label: i18n.OAUTH_CERT_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * OAuth2 Client Credentials Flow with Certificate-Based Authentication,
 * scoped to Microsoft Entra ID.
 *
 * Uses a signed JWT client assertion (PS256 + x5t#S256) instead of a
 * client secret to authenticate with the Entra token endpoint.
 *
 * Intentionally Entra-shaped (PS256, x5t#S256, no `kid`, no RS256 fallback).
 * When a second consumer appears, promote the hard-coded knobs in
 * build_client_assertion.ts to parameters and introduce an
 * `oauth_private_key_jwt` auth type that supersedes this one.
 */
export const OAuthEntraClientCertificate: AuthTypeSpec<AuthSchemaType> = {
  id: 'oauth_entra_client_certificate',
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    let clientAssertion: string;
    try {
      clientAssertion = ctx.buildClientAssertion({
        tokenUrl: secret.tokenUrl,
        clientId: secret.clientId,
        certificate: secret.certificate,
        privateKey: secret.privateKey,
        passphrase: secret.passphrase,
      });
    } catch (error) {
      throw new EntraAuthError(
        'assertion',
        `Unable to build client assertion (check certificate/privateKey/passphrase): ${error.message}`,
        { cause: error }
      );
    }

    let token;
    try {
      token = await ctx.getToken({
        authType: 'oauth_entra_client_certificate',
        tokenUrl: secret.tokenUrl,
        scope: secret.scope,
        clientId: secret.clientId,
        additionalFields: {
          client_assertion: clientAssertion,
          client_assertion_type: CLIENT_ASSERTION_TYPE,
        },
      });
    } catch (error) {
      throw new EntraAuthError(
        'exchange',
        `Unable to retrieve/refresh the access token from ${secret.tokenUrl}: ${error.message}`,
        { cause: error }
      );
    }

    if (!token) {
      throw new EntraAuthError(
        'exchange',
        `Unable to retrieve new access token from ${secret.tokenUrl}`
      );
    }

    // set global defaults
    axiosInstance.defaults.headers.common.Authorization = token;

    return axiosInstance;
  },
};
