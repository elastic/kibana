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
import type { AxiosInstance } from 'axios';
import { Parser } from 'xml2js';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';
import { signRequest } from './aws_credential_helpers';
import { sha256Hash } from './aws_crypto_helpers';
import { createAwsSigV4Interceptor } from './aws_sigv4_interceptor';

const DEFAULT_ROLE_SESSION_NAME = 'kibana-connector';

// IAM role ARN: partition, 12-digit account id, and a role name with an optional path. The AWS China
// partition (aws-cn) is left out: the DynamoDB endpoint the connector calls does not exist there.
const ROLE_ARN_PATTERN = /^arn:aws(-us-gov)?:iam::\d{12}:role\/[\w+=,.@/-]+$/;
// The Region comes from the request hostname and is used to build the STS hostname.
const REGION_PATTERN = /^[a-z][a-z0-9-]*-\d+$/;
// STS limits: RoleArn up to 2048 characters, ExternalId up to 1224, RoleSessionName up to 64.
const EXTERNAL_ID_PATTERN = /^[\w+=,.@:/-]*$/;
const ROLE_SESSION_NAME_PATTERN = /^[\w+=,.@-]*$/;

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

/**
 * Module-level cache keyed by a digest of everything that identifies the credentials. The key covers
 * the secret access key too, so a connector that knows another connector's access key id and role ARN
 * but not its secret cannot reuse that connector's temporary credentials.
 */
const credentialCache = new Map<string, TempCredentials>();

/** AssumeRole calls in flight, keyed like the cache, so a burst of requests makes one STS call. */
const pendingRefreshes = new Map<string, Promise<TempCredentials>>();

/** Bounds memory when many connectors are created and deleted over the life of the process. */
const MAX_CACHED_CREDENTIALS = 100;

/** Refresh credentials this many ms before they expire to avoid races */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  roleArn: string,
  roleSessionName: string,
  externalId?: string
): Promise<string> =>
  sha256Hash(
    JSON.stringify([
      region,
      accessKeyId,
      secretAccessKey,
      roleArn,
      roleSessionName,
      externalId ?? null,
    ])
  );

/** Drops expired entries, then the oldest ones, so the cache stays under its cap. */
const storeCredentials = (cacheKey: string, credentials: TempCredentials): void => {
  const now = Date.now();
  for (const [key, cached] of credentialCache) {
    if (cached.expiration <= now) {
      credentialCache.delete(key);
    }
  }
  credentialCache.delete(cacheKey);
  while (credentialCache.size >= MAX_CACHED_CREDENTIALS) {
    const oldest = credentialCache.keys().next().value;
    if (oldest === undefined) break;
    credentialCache.delete(oldest);
  }
  credentialCache.set(cacheKey, credentials);
};

/** Turns an STS failure into a message that names AssumeRole, not the service the caller wanted. */
const describeStsError = (error: unknown): string => {
  const { response } = error as { response?: { status?: number; data?: unknown } };
  const data = typeof response?.data === 'string' ? response.data : '';
  const code = /<Code>([^<]{1,100})<\/Code>/.exec(data)?.[1];
  const message = /<Message>([^<]{1,500})<\/Message>/.exec(data)?.[1];
  if (code) {
    return `AWS STS AssumeRole failed [${code}]: ${message ?? 'no message returned'}`;
  }
  const reason = response?.status
    ? `HTTP ${response.status}`
    : error instanceof Error
    ? error.message
    : 'unknown error';
  return `AWS STS AssumeRole failed: ${reason}`;
};

// ============================================================================
// STS AssumeRole helper
// ============================================================================

/**
 * Call AWS STS AssumeRole and return temporary credentials.
 * Uses the regional STS endpoint, because tokens from the global endpoint are not accepted in Regions
 * that are not enabled by default, and the global endpoint cannot assume GovCloud roles.
 */
async function callAssumeRole(
  httpClient: AxiosInstance,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  roleArn: string,
  roleSessionName: string,
  externalId?: string
): Promise<TempCredentials> {
  if (!REGION_PATTERN.test(region)) {
    throw new Error(`AWS STS AssumeRole failed: "${region}" is not a valid AWS Region`);
  }
  const host = `sts.${region}.amazonaws.com`;
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

  let response;
  try {
    response = await httpClient.post(`https://${host}/`, body, {
      headers: {
        ...sigHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // The signed request carries the long-lived access key; never follow it to another host.
      maxRedirects: 0,
    });
  } catch (error: unknown) {
    throw new Error(describeStsError(error));
  }

  const parser = new Parser({ explicitArray: false, ignoreAttrs: true });
  const parsed = (await parser.parseStringPromise(response.data as string)) as {
    AssumeRoleResponse?: {
      AssumeRoleResult?: {
        Credentials?: {
          AccessKeyId: string;
          SecretAccessKey: string;
          SessionToken: string;
          Expiration: string;
        };
      };
    };
  } | null;
  const credentials = parsed?.AssumeRoleResponse?.AssumeRoleResult?.Credentials;
  if (!credentials) {
    throw new Error('AWS STS AssumeRole returned an unexpected response');
  }

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
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  roleArn: string,
  roleSessionName: string,
  externalId?: string
): Promise<TempCredentials> {
  const cacheKey = await getCacheKey(
    region,
    accessKeyId,
    secretAccessKey,
    roleArn,
    roleSessionName,
    externalId
  );
  const cached = credentialCache.get(cacheKey);

  if (cached && cached.expiration - Date.now() > REFRESH_BUFFER_MS) {
    return cached;
  }

  // Concurrent requests on a cold or expiring entry share one AssumeRole call.
  const pending = pendingRefreshes.get(cacheKey);
  if (pending) {
    return pending;
  }

  const refresh = callAssumeRole(
    httpClient,
    region,
    accessKeyId,
    secretAccessKey,
    roleArn,
    roleSessionName,
    externalId
  )
    .then((creds) => {
      storeCredentials(cacheKey, creds);
      return creds;
    })
    .finally(() => {
      pendingRefreshes.delete(cacheKey);
    });
  pendingRefreshes.set(cacheKey, refresh);
  return refresh;
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
        .max(2048)
        .regex(ROLE_ARN_PATTERN, { message: i18n.AWS_IAM_ROLE_ARN_INVALID_MESSAGE })
        .describe(
          'The ARN of the IAM role to assume. Example: arn:aws:iam::123456789012:role/MyRole'
        )
        .meta({ label: i18n.AWS_IAM_ROLE_ARN_LABEL }),
      externalId: z
        .string()
        .max(1224)
        .regex(EXTERNAL_ID_PATTERN, { message: i18n.AWS_IAM_ROLE_EXTERNAL_ID_INVALID_MESSAGE })
        .optional()
        .describe(
          'Optional external ID for cross-account role assumption. Required when the role trust policy specifies a sts:ExternalId condition.'
        )
        .meta({ label: i18n.AWS_IAM_ROLE_EXTERNAL_ID_LABEL }),
      roleSessionName: z
        .string()
        .max(64)
        .regex(ROLE_SESSION_NAME_PATTERN, {
          message: i18n.AWS_IAM_ROLE_SESSION_NAME_INVALID_MESSAGE,
        })
        .optional()
        .default(DEFAULT_ROLE_SESSION_NAME)
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
 * X-Amz-Security-Token). The STS call goes to the regional endpoint of the Region being
 * requested. Temporary credentials are cached in memory per Region and refreshed
 * automatically 5 minutes before expiry.
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
    const { accessKeyId, secretAccessKey, roleArn, externalId } = secret;
    // A blank session name from the form falls back to the default rather than failing in STS.
    const roleSessionName = secret.roleSessionName || DEFAULT_ROLE_SESSION_NAME;

    // Create a separate client for STS AssumeRole calls, inheriting the platform's
    // configured defaults (timeouts, base headers, etc.) but without our signing
    // interceptor — which would otherwise create a circular dependency since STS
    // is also an *.amazonaws.com host.
    const stsClient = axios.create(axiosInstance.defaults);

    axiosInstance.interceptors.request.use(
      createAwsSigV4Interceptor(({ region }) =>
        getTemporaryCredentials(
          stsClient,
          region,
          accessKeyId,
          secretAccessKey,
          roleArn,
          roleSessionName,
          externalId
        )
      )
    );

    return axiosInstance;
  },
};
