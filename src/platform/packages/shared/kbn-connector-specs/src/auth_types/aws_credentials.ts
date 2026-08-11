/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';
import {
  buildCanonicalQueryString,
  escapeSigV4ReservedChars,
  parseAwsHost,
  signRequest,
} from './aws_credential_helpers';

// ============================================================================
// Auth Type Definition
// ============================================================================

const authSchema = lazySchema(() =>
  z
    .object({
      accessKeyId: z
        .string()
        .min(1, { message: i18n.AWS_ACCESS_KEY_ID_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.AWS_ACCESS_KEY_ID_LABEL }),
      secretAccessKey: z
        .string()
        .min(1, { message: i18n.AWS_SECRET_ACCESS_KEY_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.AWS_SECRET_ACCESS_KEY_LABEL }),
    })
    .meta({ label: i18n.AWS_CREDENTIALS_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * AWS Credentials Authentication (SigV4)
 *
 * Adds a request interceptor that automatically signs every outgoing request
 * to *.amazonaws.com with AWS Signature V4. Non-AWS URLs pass through unsigned.
 *
 * Service and region are extracted from the URL hostname pattern:
 *   {service}.{region}.amazonaws.com
 *
 * Use for: Lambda, S3, EC2, SES, and any other AWS service.
 */
export const AwsCredentialsAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'aws_credentials',
  schema: authSchema,
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    const { accessKeyId, secretAccessKey } = secret;

    axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
        const requestUrl = config.url;
        if (!requestUrl) {
          return config;
        }

        // Resolve full URL (handles relative URLs with baseURL)
        const fullUrl =
          config.baseURL && !requestUrl.startsWith('http')
            ? new URL(requestUrl, config.baseURL)
            : new URL(requestUrl);

        const awsInfo = parseAwsHost(fullUrl.hostname);
        if (!awsInfo) {
          return config;
        }

        const method = (config.method || 'GET').toUpperCase();
        // `fullUrl.pathname` may already contain `%XX` escapes from the
        // action's own `encodeURIComponent` calls, but never escapes
        // `! ' ( ) *` (e.g. a "logs-*" index pattern) — fix those up here so
        // the same rule applies to the path as to the query string below.
        const path = escapeSigV4ReservedChars(fullUrl.pathname);
        const queryParams: Record<string, string> = {};
        fullUrl.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });

        // `config.params` is merged into `config.url` by axios's own
        // dispatchRequest/buildURL step, which runs *after* request
        // interceptors — so at this point it's still a separate, unserialized
        // object rather than part of `fullUrl.searchParams` above. Fold it in
        // here (dropping null/undefined the same way axios's own params
        // serializer does) so it gets included in the signature.
        if (config.params && typeof config.params === 'object') {
          for (const [key, value] of Object.entries(config.params as Record<string, unknown>)) {
            if (value === undefined || value === null) {
              continue;
            }
            queryParams[key] = String(value);
          }
        }

        const body =
          typeof config.data === 'string'
            ? config.data
            : config.data != null
            ? JSON.stringify(config.data)
            : undefined;

        // Collect existing headers for signing
        const existingHeaders: Record<string, string> = {};
        if (config.headers) {
          for (const [key, value] of Object.entries(config.headers.toJSON())) {
            if (typeof value === 'string') {
              existingHeaders[key] = value;
            }
          }
        }

        const sigV4Headers = await signRequest(
          method,
          fullUrl.hostname,
          path,
          queryParams,
          accessKeyId,
          secretAccessKey,
          awsInfo.region,
          awsInfo.service,
          existingHeaders,
          body
        );

        // Apply signed headers to the request
        for (const [key, value] of Object.entries(sigV4Headers)) {
          config.headers.set(key, value);
        }

        // Bake the exact query string we just signed into `config.url` (by
        // plain string concatenation, not the `URL.search` setter, which
        // would re-run its own percent-encoding pass) and drop
        // `config.params`. Axios's default params serializer un-escapes
        // `:`, `$`, `,`, and turns spaces into `+` after encodeURIComponent —
        // if left in place, it would send a *differently*-encoded query
        // string than the one covered by the signature above, and AWS
        // rejects any mismatch with a generic access-denied error.
        const canonicalQuerystring = buildCanonicalQueryString(queryParams);
        config.url = `${fullUrl.origin}${path}${
          canonicalQuerystring ? `?${canonicalQuerystring}` : ''
        }`;
        config.params = undefined;

        return config;
      }
    );

    return axiosInstance;
  },
};
