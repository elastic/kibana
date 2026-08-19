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
import { getGcpAccessToken, parseServiceAccountKey } from './gcp_jwt_helpers';

const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

const authSchema = lazySchema(() =>
  z
    .object({
      serviceAccountJson: z
        .string()
        .min(1, { message: i18n.GCP_SERVICE_ACCOUNT_JSON_REQUIRED_MESSAGE })
        .meta({
          sensitive: true,
          widget: 'fileUpload',
          widgetOptions: { accept: '.json' },
          label: i18n.GCP_SERVICE_ACCOUNT_JSON_LABEL,
          helpText: i18n.GCP_SERVICE_ACCOUNT_JSON_HELP_TEXT,
        }),
      scope: z.string().optional().meta({
        label: i18n.GCP_SERVICE_ACCOUNT_SCOPE_LABEL,
        helpText: i18n.GCP_SERVICE_ACCOUNT_SCOPE_HELP_TEXT,
        hidden: true,
      }),
    })
    .meta({ label: i18n.GCP_SERVICE_ACCOUNT_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * GCP Service Account Authentication
 *
 * Uses a GCP service account JSON key to obtain short-lived access tokens
 * via the JWT bearer assertion flow (RFC 7523).
 *
 * Flow:
 * 1. Parse the service account JSON to extract client_email and private_key
 * 2. Create a self-signed JWT (RS256) with the requested OAuth scope
 * 3. Exchange the JWT for an access token at Google's token endpoint
 * 4. Set the access token as a Bearer Authorization header
 *
 * Use for: Cloud Functions, Cloud Run, Cloud Storage, BigQuery, and any GCP API.
 */
export const GcpServiceAccountAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'gcp_service_account',
  schema: authSchema,
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    const serviceAccount = parseServiceAccountKey(secret.serviceAccountJson);
    const scope = secret.scope || DEFAULT_SCOPE;

    const { accessToken } = await getGcpAccessToken(
      serviceAccount.client_email,
      serviceAccount.private_key,
      scope
    );

    axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    return axiosInstance;
  },
};
