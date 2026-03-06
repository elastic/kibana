/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

// ============================================================================
// SigV4 Signing Utilities
// ============================================================================

const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

async function sha256Hash(message: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: BufferSource, message: string): Promise<ArrayBuffer> {
  const textEncoder = new TextEncoder();
  const messageData = textEncoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return await crypto.subtle.sign('HMAC', cryptoKey, messageData);
}

async function calculateSignature(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
  stringToSign: string
): Promise<string> {
  const textEncoder = new TextEncoder();

  const kDate = await hmacSha256(textEncoder.encode('AWS4' + secretAccessKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256(kSigning, stringToSign);

  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse an AWS hostname into service and region.
 * Supports: {service}.{region}.amazonaws.com
 */
function parseAwsHost(hostname: string): { service: string; region: string, itemName?: string } | null {
  if (!hostname.endsWith('.amazonaws.com')) {
    return null;
  }
  const parts = hostname.replace('.amazonaws.com', '').split('.');
  if (parts.length < 2) {
    return null;
  }

  if (parts.length == 2) {
    return { service: parts[0], region: parts[1] };
  }

  // Handle item-specific hostnames like {bucket}.s3.{region}.amazonaws.com
  return { itemName: parts[0], service: parts[1], region: parts[2] };
}

/**
 * Sign an AWS request with SigV4.
 * Automatically collects x-amz-* headers for signing (AWS requires them signed).
 */
async function signRequest(
  method: string,
  host: string,
  path: string,
  queryParams: Record<string, string>,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string,
  existingHeaders: Record<string, string>,
  body?: string
): Promise<Record<string, string>> {
  const algorithm = 'AWS4-HMAC-SHA256';
  const now = new Date();
  const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const sortedParams = Object.keys(queryParams).sort();
  const canonicalQuerystring = sortedParams
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const hasBody = body !== undefined && body !== '';
  const payloadHash = hasBody ? await sha256Hash(body) : EMPTY_BODY_SHA256;

  // Build canonical headers: host + content-type (if body) + x-amz-date + any existing x-amz-* headers
  const headersToSign: Record<string, string> = {
    host,
    'x-amz-date': amzDate,
  };

  if (hasBody) {
    headersToSign['content-type'] = 'application/json';
  }

  // Include any x-amz-* headers set by the action handler (AWS requires them signed)
  for (const [key, value] of Object.entries(existingHeaders)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('x-amz-') && lowerKey !== 'x-amz-date') {
      headersToSign[lowerKey] = value;
    }
  }

  const sortedHeaderKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headersToSign[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    path,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalRequestHash = await sha256Hash(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join('\n');

  const signature = await calculateSignature(
    secretAccessKey,
    dateStamp,
    region,
    service,
    stringToSign
  );

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const result: Record<string, string> = {
    Host: host,
    'X-Amz-Date': amzDate,
    Authorization: authorizationHeader,
  };

  // if it's an S3 request, we need the "x-amz-content-sha256" header to be set
  if (service === 's3') {
    result['x-amz-content-sha256'] = payloadHash;
  }

  if (hasBody) {
    result['Content-Type'] = 'application/json';
  }

  return result;
}

// ============================================================================
// Auth Type Definition
// ============================================================================

const authSchema = z
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
  .meta({ label: i18n.AWS_CREDENTIALS_LABEL });

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

        return config;
      }
    );

    return axiosInstance;
  },
};
