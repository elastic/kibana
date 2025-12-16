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
    username: z
      .string()
      .min(1, { message: i18n.BASIC_AUTH_USERNAME_REQUIRED_MESSAGE })
      .meta({ label: i18n.BASIC_AUTH_USERNAME_LABEL }),
    password: z
      .string()
      .min(1, { message: i18n.BASIC_AUTH_PASSWORD_REQUIRED_MESSAGE })
      .meta({ sensitive: true, label: i18n.BASIC_AUTH_PASSWORD_LABEL }),
  })
  .meta({ label: i18n.BASIC_AUTH_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * HTTP Basic Authentication
 * Use for: Username + Password auth (Jira, etc.)
 */
export const BasicAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'basic',
  schema: authSchema,
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    // set global defaults
    axiosInstance.defaults.auth = {
      username: secret.username,
      password: secret.password,
    };

    return axiosInstance;
  },
};
