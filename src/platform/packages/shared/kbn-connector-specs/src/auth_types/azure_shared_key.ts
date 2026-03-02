/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules -- HMAC-SHA256 for Azure Shared Key signing runs server-side only */
import { createHmac } from 'crypto';
import { z } from '@kbn/zod/v4';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

const authSchema = z
  .object({
    accountName: z
      .string()
      .min(1, { message: i18n.AZURE_SHARED_KEY_ACCOUNT_NAME_REQUIRED_MESSAGE })
      .meta({ label: i18n.AZURE_SHARED_KEY_ACCOUNT_NAME_LABEL }),
    accountKey: z
      .string()
      .min(1, { message: i18n.AZURE_SHARED_KEY_ACCOUNT_KEY_REQUIRED_MESSAGE })
      .meta({ sensitive: true, label: i18n.AZURE_SHARED_KEY_ACCOUNT_KEY_LABEL }),
  })
  .meta({ label: i18n.AZURE_SHARED_KEY_AUTH_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Build CanonicalizedHeaders: all x-ms-* headers lowercased, sorted, format key:value\n.
 * @see https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
 */
export function buildCanonicalizedHeaders(headers: Record<string, string>): string {
  const msHeaders: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (lower.startsWith('x-ms-')) {
      const trimmed = (value ?? '').replace(/\s+/g, ' ').trim();
      msHeaders.push([lower, trimmed]);
    }
  }
  msHeaders.sort(([a], [b]) => a.localeCompare(b));
  return msHeaders.map(([k, v]) => `${k}:${v}\n`).join('');
}

/**
 * Build CanonicalizedResource: /accountName + path + \n + sorted query params as key:value.
 * Path is the URL pathname; query params are URL-decoded and sorted by name.
 */
export function buildCanonicalizedResource(
  accountName: string,
  pathname: string,
  searchParams: Record<string, string>
): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  let resource = `/${accountName}${path}`;
  const paramEntries = Object.entries(searchParams)
    .map(([k, v]) => [k.toLowerCase(), decodeURIComponent(v ?? '')] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));
  if (paramEntries.length > 0) {
    resource += '\n' + paramEntries.map(([k, v]) => `${k}:${v}`).join('\n');
  }
  return resource;
}

/**
 * Build the string-to-sign for Blob/Queue Shared Key (2009-09-19+).
 * Standard headers in fixed order; use empty string when absent. When x-ms-date is set, Date line is empty.
 * Content-Length 0 is sent as empty string.
 */
export function buildStringToSign(
  verb: string,
  requestHeaders: Record<string, string>,
  canonicalizedHeaders: string,
  canonicalizedResource: string
): string {
  const get = (name: string): string => {
    const lower = name.toLowerCase();
    const value = Object.entries(requestHeaders).find(([k]) => k.toLowerCase() === lower)?.[1];
    if (value === undefined || value === null) return '';
    if (lower === 'content-length' && (value === '0' || value === '')) return '';
    return (value ?? '').trim();
  };

  const useXMsDate = Object.keys(requestHeaders).some((k) =>
    k.toLowerCase().startsWith('x-ms-date')
  );
  const dateValue = useXMsDate ? '' : get('date');

  const lines = [
    verb.toUpperCase(),
    get('content-encoding'),
    get('content-language'),
    get('content-length'),
    get('content-md5'),
    get('content-type'),
    dateValue,
    get('if-modified-since'),
    get('if-match'),
    get('if-none-match'),
    get('if-unmodified-since'),
    get('range'),
  ];
  return lines.join('\n') + '\n' + canonicalizedHeaders + canonicalizedResource;
}

/**
 * Compute the Shared Key signature: HMAC-SHA256 over UTF-8 string-to-sign with Base64-decoded key, result Base64-encoded.
 */
export function computeSignature(stringToSign: string, base64AccountKey: string): string {
  const keyBuffer = Buffer.from(base64AccountKey, 'base64');
  const hmac = createHmac('sha256', keyBuffer);
  hmac.update(stringToSign, 'utf8');
  return hmac.digest('base64');
}

function getRequestUrl(config: InternalAxiosRequestConfig): {
  pathname: string;
  searchParams: Record<string, string>;
} {
  const base = config.baseURL ?? 'http://localhost';
  const urlPath = config.url ?? '/';
  const fullUrl = urlPath.startsWith('http') ? urlPath : new URL(urlPath, base).href;
  const parsed = new URL(fullUrl);
  const searchParams: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });
  // Merge in config.params (axios sends these as query string; they may not be in url yet)
  const params = config.params as Record<string, unknown> | undefined;
  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams[key] = String(value);
      }
    }
  }
  return { pathname: parsed.pathname, searchParams };
}

/**
 * Format UTC date for x-ms-date (RFC 7231 / RFC 2822).
 */
function formatMsDate(): string {
  return new Date().toUTCString();
}

/**
 * Azure Blob Storage Shared Key authentication.
 * Signs each request with HMAC-SHA256 per the Azure REST API.
 * @see https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
 */
export const AzureSharedKeyAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'azure_shared_key',
  schema: authSchema,
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    const { accountName, accountKey } = secret;

    axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const msDate = formatMsDate();
      const headers: Record<string, string> = {
        ...(config.headers as Record<string, string>),
        'x-ms-date': msDate,
      };

      const { pathname, searchParams } = getRequestUrl(config);
      const canonicalizedHeaders = buildCanonicalizedHeaders(headers);
      const canonicalizedResource = buildCanonicalizedResource(accountName, pathname, searchParams);
      const stringToSign = buildStringToSign(
        (config.method ?? 'GET').toUpperCase(),
        headers,
        canonicalizedHeaders,
        canonicalizedResource
      );
      const signature = computeSignature(stringToSign, accountKey);
      const authHeader = `SharedKey ${accountName}:${signature}`;

      config.headers = config.headers ?? {};
      config.headers['x-ms-date'] = msDate;
      config.headers.Authorization = authHeader;

      return config;
    });

    return axiosInstance;
  },
};
