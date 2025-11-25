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
import { isString } from 'lodash';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';

const HEADER_FIELD_DEFAULT = 'Api-Key';
const authSchema = z
  .object({
    headerField: z.string().describe('API Key header field').default(HEADER_FIELD_DEFAULT),
    apiKey: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
      sensitive: true,
      label: 'API Key',
    }),
  })
  .meta({ label: 'API Key Header Authentication' });

type AuthSchemaType = z.infer<typeof authSchema>;
type NormalizedAuthSchemaType = Record<string, string>;

/**
 * Header-based authentication (generic)
 * Use for: API keys, custom headers (X-API-Key, etc.)
 */
export const ApiKeyHeaderAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'api_key_header',
  schema: authSchema,
  normalizeSchema: (defaults?: Record<string, unknown>) => {
    const existingMeta = authSchema.meta() ?? {};
    const schemaToUse = z.object({
      ...authSchema.shape,
    });

    if (defaults) {
      // get the default values for the headerField
      const headerField: string =
        defaults.headerField && isString(defaults.headerField)
          ? defaults.headerField
          : HEADER_FIELD_DEFAULT;
      return z.object({
        [headerField]: schemaToUse.shape.apiKey,
      });
    }

    return schemaToUse.meta(existingMeta);
  },
  configure: (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: NormalizedAuthSchemaType
  ): AxiosInstance => {
    // set global defaults
    Object.keys(secret)
      .filter((key) => key !== 'authType')
      .forEach((key) => {
        axiosInstance.defaults.headers.common[key] = secret[key];
      });

    return axiosInstance;
  },
};
