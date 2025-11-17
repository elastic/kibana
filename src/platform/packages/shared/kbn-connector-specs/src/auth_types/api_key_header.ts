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
  headerField: z.string().meta({ sensitive: true }).describe('API Key header field'),
  apiKey: z.string().meta({ sensitive: true }).describe('API Key value'),
});

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Header-based authentication (generic)
 * Use for: API keys, custom headers (X-API-Key, etc.)
 */
export const ApiKeyHeaderAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'api_key_header',
  schema: authSchema,
  configure: (axiosInstance: AxiosInstance, secret: AuthSchemaType): AxiosInstance => {
    // set global defaults
    axiosInstance.defaults.headers.common[secret.headerField] = secret.apiKey;

    return axiosInstance;
  },
};
