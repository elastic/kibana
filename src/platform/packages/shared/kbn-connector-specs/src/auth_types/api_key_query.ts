/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import { isString } from 'lodash';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

const authSchema = lazySchema(() =>
  z
    .object({
      apiKey: z
        .string()
        .min(1, { message: i18n.API_KEY_QUERY_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.API_KEY_QUERY_LABEL }),
    })
    .meta({ label: i18n.API_KEY_QUERY_AUTHENTICATION_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;
type NormalizedAuthSchemaType = Record<string, string>;

/**
 * Query-param authentication (generic)
 * Use for: APIs that require one or more credentials passed as URL query
 * parameters rather than headers (e.g. Trello's `key`/`token` pair).
 *
 * Configure the query param name(s) via `defaults.paramNames` (an array of
 * strings). Each name becomes its own sensitive input field. If
 * `paramNames` is omitted, falls back to a single `apiKey` field.
 */
export const ApiKeyQueryAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'api_key_query',
  schema: authSchema,
  allowedConfigKeys: ['paramNames'],
  normalizeSchema: (defaults?: Record<string, unknown>) => {
    const meta = authSchema.meta() ?? {};
    const paramNames =
      defaults?.paramNames && Array.isArray(defaults.paramNames)
        ? defaults.paramNames.filter((s): s is string => isString(s) && s.length > 0)
        : undefined;

    if (paramNames && paramNames.length > 0) {
      return z
        .object(
          Object.fromEntries(
            paramNames.map((paramName) => [
              paramName,
              z
                .string()
                .min(1, { message: i18n.API_KEY_QUERY_REQUIRED_MESSAGE })
                .meta({ sensitive: true, label: paramName }),
            ])
          )
        )
        .meta(meta);
    }

    return z.object({ ...authSchema.shape }).meta(meta);
  },
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: NormalizedAuthSchemaType
  ): Promise<AxiosInstance> => {
    // Exclude framework-injected metadata keys that should not become query params.
    const FRAMEWORK_SECRET_KEYS = new Set(['authType']);
    axiosInstance.defaults.params = {
      ...axiosInstance.defaults.params,
      ...Object.fromEntries(
        Object.keys(secret)
          .filter((key) => !FRAMEWORK_SECRET_KEYS.has(key))
          .map((key) => [key, secret[key]])
      ),
    };

    return axiosInstance;
  },
};
