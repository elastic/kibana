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

const authSchema = z
  .object({
    tokenUrl: z.url().meta({ label: i18n.OAUTH_TOKEN_URL_LABEL }),
    clientId: z
      .string()
      .min(1, { message: i18n.OAUTH_CLIENT_ID_REQUIRED_MESSAGE })
      .meta({ label: i18n.OAUTH_CLIENT_ID_LABEL }),
    scope: z.string().meta({ label: i18n.OAUTH_SCOPE_LABEL }).optional(),
    clientSecret: z
      .string()
      .min(1, { message: i18n.OAUTH_CLIENT_SECRET_REQUIRED_MESSAGE })
      .meta({ label: i18n.OAUTH_CLIENT_SECRET_LABEL, sensitive: true }),
  })
  .meta({ label: i18n.OAUTH_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * OAuth2 Client Credentials Flow
 */
export const OAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'oauth_client_credentials',
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    let token;
    try {
      token = await ctx.getToken({
        tokenUrl: secret.tokenUrl,
        scope: secret.scope,
        clientId: secret.clientId,
        clientSecret: secret.clientSecret,
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
