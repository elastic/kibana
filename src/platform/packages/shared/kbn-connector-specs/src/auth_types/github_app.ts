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
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

export const GITHUB_APP_AUTH_ID = 'github_app';

const authSchema = lazySchema(() =>
  z
    .object({
      appId: z
        .string()
        .min(1, { message: i18n.GITHUB_APP_ID_REQUIRED_MESSAGE })
        .regex(/^\d+$/, { message: i18n.GITHUB_APP_ID_INVALID_MESSAGE })
        .meta({
          label: i18n.GITHUB_APP_ID_LABEL,
          helpText: i18n.GITHUB_APP_ID_HELP_TEXT,
        }),
      privateKey: z
        .string()
        .min(1, { message: i18n.GITHUB_APP_PRIVATE_KEY_REQUIRED_MESSAGE })
        .meta({
          sensitive: true,
          label: i18n.GITHUB_APP_PRIVATE_KEY_LABEL,
          helpText: i18n.GITHUB_APP_PRIVATE_KEY_HELP_TEXT,
        }),
    })
    .meta({ label: i18n.GITHUB_APP_AUTH_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * GitHub App credentials.
 *
 * This auth method stores the long-lived App material in Kibana so callers can
 * mint short-lived installation tokens for scoped operations such as sandboxed
 * git/gh access. It intentionally does not configure normal connector HTTP
 * requests: GitHub App installation tokens must be minted for a specific
 * installation/repository at use time.
 */
export const GithubAppAuth: AuthTypeSpec<AuthSchemaType> = {
  id: GITHUB_APP_AUTH_ID,
  schema: authSchema,
  configure: async (_: AuthContext, axiosInstance: AxiosInstance): Promise<AxiosInstance> =>
    axiosInstance,
};
