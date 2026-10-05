/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, HttpFetchOptionsWithPath } from '@kbn/core/public';

const ESQL_INTERNAL_PATH = '/internal/esql/';

const sha256 = async (value: string): Promise<string> => {
  // crypto.subtle is only available in secure contexts (https or localhost)
  if (!crypto.subtle) {
    return value;
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Adds a per-user `user-hash` header to ES|QL GET requests, so HTTP-cached (stale-while-revalidate)
 * responses, which vary by this header, are never served to a different user in the same browser.
 */
export const registerUserHashInterceptor = (core: CoreSetup): void => {
  let userHash: Promise<string | undefined> | undefined;
  const getUserHash = async (): Promise<string | undefined> => {
    const [{ security }] = await core.getStartServices();
    const user = await security.authc.getCurrentUser().catch(() => undefined);
    return user?.profile_uid ? sha256(user.profile_uid) : undefined;
  };

  core.http.intercept({
    request: async (fetchOptions): Promise<Partial<HttpFetchOptionsWithPath>> => {
      if (fetchOptions.method !== 'GET' || !fetchOptions.path.startsWith(ESQL_INTERNAL_PATH)) {
        return {};
      }
      userHash ??= getUserHash();
      const hash = await userHash;
      if (!hash) {
        return {};
      }
      return { headers: { ...fetchOptions.headers, 'user-hash': hash } };
    },
  });
};
