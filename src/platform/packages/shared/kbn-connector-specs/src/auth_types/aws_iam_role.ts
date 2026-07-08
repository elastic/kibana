/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Parser } from 'xml2js';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';
import { parseAwsHost, signRequest } from './aws_credential_helpers';

// ============================================================================
// Temporary credential cache
// ============================================================================

interface TempCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  /** Expiration time as epoch milliseconds */
  expiration: number;
}

/** Module-level cache keyed by "{accessKeyId}::{roleArn}" */
const credentialCache = new Map<string, TempCredentials>();

/** Refresh credentials this many ms before they expire to avoid races */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(accessKeyId: string, roleArn: string): string {
  return `${accessKeyId}::${roleArn}`;
}

// ============================================================================
// STS AssumeRole helper
// ============================================================================

/**
 * Call AWS STS AssumeRole and return temporary credentials.
 * Uses the global STS endpoint (us-east-1) which works for all accounts/regions.
 */
async function callAssumeRole(
  httpClient: AxiosInstance,
  accessKeyId: string,
  secretAccessKey: string,
  roleArn: string,
  roleSessionName: string,
  externalId?: string
): Promise<TempCredentials> {
  const host = 'sts.amazonaws.com';
  const region = 'us-east-1'; // Global STS endpoint region for signing
  const method = 'POST';
  const path = '/';

  const bodyParts = [
    'Action=AssumeRole',
    `RoleArn=${encodeURIComponent(roleArn)}`,
    `RoleSessionName=${encodeURIComponent(roleSessionName)}`,
    'Version=2011-06-15',
  ];
  if (externalId) {
    bodyParts.push(`ExternalId=${encodeURIComponent(externalId)}`);
  }
  const body = bodyParts.join('&');

  const existingHeaders: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
  };

  const sigHeaders = await signRequest(
    method,
    host,
    path,
    {}, // no query params
    accessKeyId,
    secretAccessKey,
    region,
    'sts',
    existingHeaders,
    body
    // no sessionToken — base credentials are long-lived
  );

  const response = await httpClient.post(`https://${host}/`, body, {
    headers: {
      ...sigHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const parser = new Parser({ explicitArray: false, ignoreAttrs: true });
  const parsed = await parser.parseStringPromise(response.data as string);
  const credentials = (
    parsed as {
      AssumeRoleResponse: {
        AssumeRoleResult: {
          Credentials: {
            AccessKeyId: string;
            SecretAccessKey: string;
            SessionToken: string;
            Expiration: string;
          };
        };
      };
    }
  ).AssumeRoleResponse.AssumeRoleResult.Credentials;

  return {
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken,
    expiration: new Date(credentials.Expiration).getTime(),
  };
}

/**
 * Return cached temporary credentials, refreshing via AssumeRole if expired or near expiry.
 */
async function getTemporaryCredentials(
  httpClient: AxiosInstance,
  accessKeyId: string,
  secretAccessKey: string,
  roleArn: string,
  roleSessionName: string,
  externalId?: string
): Promise<TempCredentials> {
  const cacheKey = getCacheKey(accessKeyId, roleArn);
  const cached = credentialCache.get(cacheKey);

  if (cached && cached.expiration - Date.now() > REFRESH_BUFFER_MS) {
    return cached;
  }

  const creds = await callAssumeRole(
    httpClient,
    accessKeyId,
    secretAccessKey,
    roleArn,
    roleSessionName,
    externalId
  );
  credentialCache.set(cacheKey, creds);
  return creds;
}

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
      roleArn: z
        .string()
        .min(1, { message: i18n.AWS_IAM_ROLE_ARN_REQUIRED_MESSAGE })
        .describe(
          'The ARN of the IAM role to assume. Example: arn:aws:iam::123456789012:role/MyRole'
        )
        .meta({ label: i18n.AWS_IAM_ROLE_ARN_LABEL }),
      externalId: z
        .string()
        .optional()
        .describe(
          'Optional external ID for cross-account role assumption. Required when the role trust policy specifies a sts:ExternalId condition.'
        )
        .meta({ label: i18n.AWS_IAM_ROLE_EXTERNAL_ID_LABEL }),
      roleSessionName: z
        .string()
        .optional()
        .default('kibana-connector')
        .describe('A name for the assumed-role session. Appears in CloudTrail logs.')
        .meta({ label: i18n.AWS_IAM_ROLE_SESSION_NAME_LABEL }),
    })
    .meta({ label: i18n.AWS_IAM_ROLE_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * AWS IAM Role Authentication (STS AssumeRole + SigV4)
 *
 * Assumes the specified IAM role via AWS STS and signs every outgoing request
 * to *.amazonaws.com using the resulting temporary credentials (SigV4 +
 * X-Amz-Security-Token). Temporary credentials are cached in memory and
 * refreshed automatically 5 minutes before expiry.
 *
 * Use for: connectors that require cross-account access or role-based permissions
 * rather than long-lived IAM user credentials.
 */
export const AwsIamRoleAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'aws_iam_role',
  schema: authSchema,
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    const { accessKeyId, secretAccessKey, roleArn, externalId, roleSessionName } = secret;
    const sessionName = roleSessionName ?? 'kibana-connector';

    // Create a separate client for STS AssumeRole calls, inheriting the platform's
    // configured defaults (timeouts, base headers, etc.) but without our signing
    // interceptor — which would otherwise create a circular dependency since STS
    // is also an *.amazonaws.com host.
    const stsClient = axios.create(axiosInstance.defaults);

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

        // Obtain (possibly cached) temporary credentials
        const tempCreds = await getTemporaryCredentials(
          stsClient,
          accessKeyId,
          secretAccessKey,
          roleArn,
          sessionName,
          externalId
        );

        const method = (config.method || 'GET').toUpperCase();
        const path = fullUrl.pathname;
        const queryParams: Record<string, string> = {};
        fullUrl.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });

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
          tempCreds.accessKeyId,
          tempCreds.secretAccessKey,
          awsInfo.region,
          awsInfo.service,
          existingHeaders,
          body,
          tempCreds.sessionToken
        );

        // Apply signed headers to the request
        for (const [key, value] of Object.entries(sigV4Headers)) {
          config.headers.set(key, value);
        }

        return config;
      }
    );

    return axiosInstance;
  },
};
