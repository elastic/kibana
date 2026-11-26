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

const authSchema = lazySchema(() =>
  z
    .object({
      apiKeyId: z
        .string()
        .trim()
        .min(1, { message: i18n.CORTEX_XDR_ADVANCED_KEY_ID_REQUIRED_MESSAGE })
        .max(64)
        .meta({ label: i18n.CORTEX_XDR_ADVANCED_KEY_ID_LABEL }),
      apiKey: z
        .string()
        .min(1, { message: i18n.CORTEX_XDR_ADVANCED_KEY_REQUIRED_MESSAGE })
        .max(1024)
        .meta({ label: i18n.CORTEX_XDR_ADVANCED_KEY_LABEL, sensitive: true }),
    })
    .meta({ label: i18n.CORTEX_XDR_ADVANCED_KEY_AUTH_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const CORTEX_XDR_NONCE_LENGTH = 64;
// The largest multiple of the alphabet size below 256; bytes at or above it are redrawn so every
// character is equally likely.
const UNBIASED_BYTE_LIMIT = 256 - (256 % NONCE_ALPHABET.length);

/** 64 random alphanumeric characters from the Web Crypto random source. */
export const createCortexXdrNonce = (): string => {
  let nonce = '';
  while (nonce.length < CORTEX_XDR_NONCE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(CORTEX_XDR_NONCE_LENGTH))) {
      if (byte < UNBIASED_BYTE_LIMIT && nonce.length < CORTEX_XDR_NONCE_LENGTH) {
        nonce += NONCE_ALPHABET[byte % NONCE_ALPHABET.length];
      }
    }
  }
  return nonce;
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * The Advanced API key headers: the key id, a one-time nonce, the time in epoch milliseconds and
 * the lowercase hex SHA-256 of key + nonce + timestamp. The key itself is never sent.
 * @see https://cortex-docs.paloaltonetworks.com/xdr-api/make-your-first-api-call.md
 */
export const buildCortexXdrAuthHeaders = async (
  apiKeyId: string,
  apiKey: string,
  nonce: string = createCortexXdrNonce(),
  timestamp: string = String(Date.now())
): Promise<Record<string, string>> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${apiKey}${nonce}${timestamp}`)
  );
  return {
    'x-xdr-auth-id': apiKeyId,
    'x-xdr-nonce': nonce,
    'x-xdr-timestamp': timestamp,
    Authorization: toHex(digest),
  };
};

/**
 * Cortex XDR Advanced API key. Signs every request (each page and each retry) with a new nonce
 * and timestamp, so a captured request can't be replayed with a fresh signature.
 */
export const CortexXdrAdvancedKeyAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'cortex_xdr_advanced_key',
  schema: authSchema,
  configure: (
    _ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    const { apiKeyId, apiKey } = secret;
    axiosInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const headers = await buildCortexXdrAuthHeaders(apiKeyId, apiKey);
      for (const [name, value] of Object.entries(headers)) {
        config.headers.set(name, value);
      }
      return config;
    });
    return Promise.resolve(axiosInstance);
  },
};
