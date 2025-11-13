/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { AxiosInstance } from 'axios';
import type { AuthTypeSpec } from '../connector_spec';

const authSchema = z.object({
  // these should default to being registered as a secret field so we don't explicitly define it here
  token: z.string().describe('Bearer Token'),
});

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Bearer Token Authentication
 * Use for: OAuth tokens, API tokens sent as "Authorization: Bearer <token>"
 */
export const BearerAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'bearer',
  name: 'Bearer Token Authentication',
  schema: authSchema,
  configure: (axiosInstance: AxiosInstance, secret: AuthSchemaType): AxiosInstance => {
    // set global defaults
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${secret.token}`;

    return axiosInstance;
  },
};

// export const BearerAuthSchema = z.object({
//   method: z.literal('bearer'),
//   token: withUIMeta(z.string(), { sensitive: true }).describe('Bearer Token'),
// });
