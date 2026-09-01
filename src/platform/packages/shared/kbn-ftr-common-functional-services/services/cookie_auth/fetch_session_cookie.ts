/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from 'util';

export interface SessionCookie {
  name: string;
  value: string;
  url: string;
}

export interface FetchSessionCookieParams {
  baseUrl: string;
  username: string;
  password: string;
  /** Kibana version string, obtained from GET /api/status. */
  kbnVersion: string;
  /** Use 'cloud-basic' on Cloud, 'basic' for local. */
  provider?: 'basic' | 'cloud-basic';
}

function extractCookieValue(headers: Headers): string {
  const headersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const firstSetCookie = headersWithGetSetCookie.getSetCookie
    ? headersWithGetSetCookie.getSetCookie()[0]
    : headers.get('set-cookie');
  return firstSetCookie?.split(';')[0].split('sid=')[1] ?? '';
}

/**
 * Pure HTTP utility — no FTR service dependency.
 * POSTs to Kibana's internal basic-auth login endpoint and returns the `sid` session cookie.
 * Used by CookieAuthService (FTR service) and @kbn/journeys AuthService.
 */
export async function fetchSessionCookie(params: FetchSessionCookieParams): Promise<SessionCookie> {
  const { baseUrl, username, password, kbnVersion, provider = 'basic' } = params;
  const loginUrl = new URL('/internal/security/login', baseUrl);

  const authResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'kbn-version': kbnVersion,
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-elastic-internal-origin': 'Kibana',
    },
    body: JSON.stringify({
      providerType: 'basic',
      providerName: provider,
      currentURL: new URL('/login?next=%2F', baseUrl).href,
      params: { username, password },
    }),
    redirect: 'manual',
  });

  if (authResponse.status !== 200) {
    throw new Error(
      `[fetchSessionCookie] Kibana auth failed for '${username}': ` +
        `code ${authResponse.status}, message: ${authResponse.statusText}`
    );
  }

  const cookieValue = extractCookieValue(authResponse.headers);
  if (!cookieValue) {
    throw new Error(
      format(
        `[fetchSessionCookie] unable to determine auth cookie for '${username}'`,
        Object.fromEntries(authResponse.headers.entries())
      )
    );
  }

  return { name: 'sid', value: cookieValue, url: baseUrl };
}
