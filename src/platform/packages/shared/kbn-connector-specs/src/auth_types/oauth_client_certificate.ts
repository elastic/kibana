/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

const authSchema = z
  .object({
    tokenUrl: z.url().meta({ label: i18n.OAUTH_TOKEN_URL_LABEL }),
    clientId: z
      .string()
      .min(1, { message: i18n.OAUTH_CLIENT_ID_REQUIRED_MESSAGE })
      .meta({ label: i18n.OAUTH_CLIENT_ID_LABEL }),
    scope: z.string().meta({ label: i18n.OAUTH_SCOPE_LABEL }).optional(),
    certificate: z
      .string()
      .min(1, { message: i18n.OAUTH_CERT_CERTIFICATE_REQUIRED_MESSAGE })
      .meta({ label: i18n.OAUTH_CERT_CERTIFICATE_LABEL }),
    privateKey: z
      .string()
      .min(1, { message: i18n.OAUTH_CERT_PRIVATE_KEY_REQUIRED_MESSAGE })
      .meta({ label: i18n.OAUTH_CERT_PRIVATE_KEY_LABEL, sensitive: true }),
    passphrase: z
      .string()
      .meta({ label: i18n.OAUTH_CERT_PASSPHRASE_LABEL, sensitive: true })
      .optional(),
  })
  .meta({ label: i18n.OAUTH_CERT_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * OAuth2 Client Credentials Flow with Certificate-Based Authentication
 *
 * Uses a signed JWT client assertion instead of a client secret
 * to authenticate with the token endpoint (e.g. Microsoft Entra ID).
 */
export const OAuthClientCertificate: AuthTypeSpec<AuthSchemaType> = {
  id: 'oauth_client_certificate',
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    let token;
    try {
      const clientAssertion = ctx.buildClientAssertion({
        tokenUrl: secret.tokenUrl,
        clientId: secret.clientId,
        certificate: secret.certificate,
        privateKey: secret.privateKey,
        passphrase: secret.passphrase,
      });

      token = await ctx.getToken({
        tokenUrl: secret.tokenUrl,
        scope: secret.scope,
        clientId: secret.clientId,
        additionalFields: {
          client_assertion: clientAssertion,
          client_assertion_type: CLIENT_ASSERTION_TYPE,
        },
      });
    } catch (error) {
      throw new Error(`Unable to retrieve/refresh the access token: ${error.message}`);
    }

    if (!token) {
      throw new Error(`Unable to retrieve new access token`);
    }

    // set global defaults
    axiosInstance.defaults.headers.common.Authorization = token;

    return axiosInstance;
  },
};
