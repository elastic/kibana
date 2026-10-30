/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

const authSchema = lazySchema(() =>
  z
    .object({
      tokenUrl: z
        .url()
        .max(2048)
        .refine((value) => {
          if (!URL.canParse(value)) return false;
          const url = new URL(value);
          return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
        }, i18n.OAUTH_HTTPS_TOKEN_URL_REQUIRED_MESSAGE)
        .meta({
          label: i18n.OAUTH_TOKEN_URL_LABEL,
          validate: { allowedHosts: true },
        }),
      username: z.string().min(1).max(1024).meta({ label: i18n.BASIC_AUTH_USERNAME_LABEL }),
      password: z
        .string()
        .min(1)
        .max(4096)
        .meta({ label: i18n.BASIC_AUTH_PASSWORD_LABEL, sensitive: true }),
      clientId: z.string().min(1).max(4096).meta({ label: i18n.OAUTH_CLIENT_ID_LABEL }),
      scope: z.string().max(4096).optional().meta({ label: i18n.OAUTH_SCOPE_LABEL }),
      usernameField: z
        .enum(['username', 'email'])
        .default('username')
        .meta({ label: i18n.OAUTH_USERNAME_FIELD_LABEL, hidden: true }),
      requestBodyFormat: z
        .enum(['form', 'json'])
        .default('form')
        .meta({ label: i18n.OAUTH_REQUEST_BODY_FORMAT_LABEL, hidden: true }),
      tokenType: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .meta({ label: i18n.OAUTH_TOKEN_TYPE_LABEL, hidden: true }),
    })
    .meta({ label: i18n.OAUTH_PASSWORD_LABEL })
);

export const OAuthPassword: AuthTypeSpec<z.infer<typeof authSchema>> = {
  id: 'oauth_password',
  schema: authSchema,
  configure: async (ctx, client, secrets) => {
    const {
      tokenUrl,
      username,
      password,
      clientId,
      scope,
      usernameField,
      requestBodyFormat,
      tokenType,
    } = secrets;
    const token = await ctx.getToken({
      authType: 'oauth_password',
      tokenUrl,
      username,
      password,
      clientId,
      scope,
      usernameField,
      requestBodyFormat,
      tokenType,
    });
    if (!token) {
      throw new Error('Unable to retrieve an OAuth password access token.');
    }
    client.defaults.headers.common.Authorization = token;
    return client;
  },
};
