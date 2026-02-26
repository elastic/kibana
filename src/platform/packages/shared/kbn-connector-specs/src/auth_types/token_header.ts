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
    token: z
      .string()
      .min(1, { message: i18n.TOKEN_HEADER_TOKEN_REQUIRED_MESSAGE })
      .meta({ sensitive: true, label: i18n.TOKEN_HEADER_TOKEN_LABEL }),
  })
  .meta({ label: i18n.TOKEN_HEADER_AUTH_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Token header authentication.
 * Use for: API tokens sent in a custom header format (e.g. "Authorization: Token token=<token>").
 */
export const TokenHeaderAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'token_header',
  schema: authSchema,
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    axiosInstance.defaults.headers.common.Authorization = `Token token=${secret.token}`;

    return axiosInstance;
  },
};
