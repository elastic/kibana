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

export const OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID =
  'oauth_client_credentials_private_key_jwt';
export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

export const JWT_ALGORITHMS = ['PS256', 'RS256', 'ES256'] as const;
export type JwtAlgorithm = (typeof JWT_ALGORITHMS)[number];

export const CERTIFICATE_BINDING_KINDS = ['x5t#S256', 'x5c', 'kid'] as const;
export type CertificateBindingKind = (typeof CERTIFICATE_BINDING_KINDS)[number];

const CERTIFICATE_MARKER = /^$|-----BEGIN CERTIFICATE-----/;
const PRIVATE_KEY_MARKER = /-----BEGIN (?:RSA |ENCRYPTED )?PRIVATE KEY-----/;

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
      algorithm: z
        .enum(JWT_ALGORITHMS)
        .meta({ label: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ALGORITHM_LABEL }),
      certificateBinding: z
        .enum(CERTIFICATE_BINDING_KINDS)
        .meta({ label: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_BINDING_LABEL }),
      certificate: z
        .string()
        .regex(CERTIFICATE_MARKER, {
          message: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_CERTIFICATE_INVALID_PEM_MESSAGE,
        })
        .optional()
        .meta({
          label: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_CERTIFICATE_LABEL,
          widget: 'fileUpload',
          widgetOptions: { accept: '.pem,.crt' },
        }),
      keyId: z
        .string()
        .optional()
        .meta({ label: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_KEY_ID_LABEL }),
      privateKey: z
        .string()
        .min(1, {
          message: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_PRIVATE_KEY_REQUIRED_MESSAGE,
        })
        .regex(PRIVATE_KEY_MARKER, {
          message: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_PRIVATE_KEY_INVALID_PEM_MESSAGE,
        })
        .meta({
          label: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_PRIVATE_KEY_LABEL,
          sensitive: true,
          widget: 'fileUpload',
          widgetOptions: { accept: '.pem,.key' },
        }),
      passphrase: z
        .string()
        .meta({
          label: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_PASSPHRASE_LABEL,
          sensitive: true,
        })
        .optional(),
    })
    .meta({ label: i18n.OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * OAuth2 client_credentials with a signed-JWT client_assertion
 * (RFC 7521 + RFC 7523 §2.2). Provider-neutral: works for any OAuth server
 * that accepts `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`,
 * including Microsoft Entra ID, Okta, and Auth0.
 *
 * The per-provider variation lives in two schema fields:
 *   - `algorithm`            ('PS256' | 'RS256' | 'ES256')
 *   - `certificateBinding`   ('x5t#S256' | 'x5c' | 'kid')
 *
 * Provider cheatsheet:
 *   - Microsoft Entra:  PS256 + x5t#S256
 *   - Okta:             RS256 + kid (private_key_jwt)
 *   - Auth0:            RS256 + kid
 *
 * Lifetime is fixed at 600s. If a future caller needs a different lifetime,
 * promote it to a schema field at that point.
 *
 * JWT signing lives in the actions plugin's `buildClientAssertion` (it has
 * the Node `crypto` dependency this shared-common package can't take).
 */
export const OAuthClientCredentialsPrivateKeyJwt: AuthTypeSpec<AuthSchemaType> = {
  id: OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    let token;
    try {
      token = await ctx.getToken({
        authType: OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
        tokenUrl: secret.tokenUrl,
        scope: secret.scope,
        clientId: secret.clientId,
      });
    } catch (error) {
      throw new Error(
        `Unable to retrieve/refresh the access token from ${secret.tokenUrl}: ${error.message}`,
        { cause: error }
      );
    }

    if (!token) {
      throw new Error(`Unable to retrieve new access token from ${secret.tokenUrl}`);
    }

    axiosInstance.defaults.headers.common.Authorization = token;
    return axiosInstance;
  },
};
