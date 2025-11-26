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

const authSchema = z.object({
  tokenUrl: z.string().meta({ sensitive: true }).url(),
  clientId: z.string().meta({ sensitive: true }),
  clientSecret: z.string().meta({ sensitive: true }),
  scope: z.string().meta({ sensitive: true }).optional(),
  additionalFields: z.string().nullish(),
});

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
    let parsedAdditionalFields;
    try {
      parsedAdditionalFields = secret.additionalFields
        ? JSON.parse(secret.additionalFields)
        : undefined;
    } catch (error) {
      ctx.logger.error(`error parsing additional fields - ${error.message}`);
    }

    let token;
    try {
      token = await ctx.getToken({
        tokenUrl: secret.tokenUrl,
        scope: secret.scope,
        clientId: secret.clientId,
        clientSecret: secret.clientSecret,
        ...(parsedAdditionalFields ? { additionalFields: parsedAdditionalFields } : {}),
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
