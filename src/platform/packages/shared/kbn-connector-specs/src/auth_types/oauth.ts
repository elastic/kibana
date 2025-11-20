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
import type { AuthTypeSpec } from '../connector_spec';

const authSchema = z.object({
  tokenUrl: z.string().meta({ sensitive: true }).url(),
  clientId: z.string().meta({ sensitive: true }),
  clientSecret: z.string().meta({ sensitive: true }),
  scope: z.string().meta({ sensitive: true }).optional(),
  additionalFields: z.string().meta({ sensitive: true }).optional(),
});

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * OAuth2 Client Credentials Flow
 */
export const OAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'oauth_client_credentials',
  schema: authSchema,
  configure: (axiosInstance: AxiosInstance /* , secret: AuthSchemaType*/): AxiosInstance => {
    // need a token management system here to handle token retrieval/refreshing
    // get token using client credentials flow

    // set Authorization header with token once retrieved

    return axiosInstance;
  },
};
