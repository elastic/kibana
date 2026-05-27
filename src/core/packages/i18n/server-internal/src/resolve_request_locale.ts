/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Name of the browser-side cookie used to remember the resolved locale across
 * authenticated and anonymous renders. Written on every render with whatever
 * locale Kibana resolved, so the cookie tracks profile changes automatically.
 */
export const KBN_LOCALE_COOKIE_NAME = 'KBN_LOCALE';

export interface ResolveRequestLocaleArgs {
  request: KibanaRequest;
  /** Locale saved on the user's profile, if any. */
  userSettingLocale: string | undefined;
  /** Server-configured default (i18n.defaultLocale). */
  configLocale: string;
  /** Configured allow-list (i18n.locales). Used for Accept-Language matching. */
  configuredLocales: readonly string[];
  /** Map of locale id → translation hash for locales we can serve. */
  translationHashes: Record<string, string>;
  /**
   * When true, Accept-Language header is consulted as a fallback. Currently
   * gated to serverless deployments.
   */
  isServerless: boolean;
  /**
   * When false, the `KBN_LOCALE` cookie is not read from the request.
   * Controlled by `i18n.allowLocaleCookie`.
   */
  allowLocaleCookie: boolean;
}

/**
 * Resolves the effective locale for a request using the following priority chain:
 *   1. User profile setting (when value is in `translationHashes`)
 *   2. KBN_LOCALE cookie (only when `allowLocaleCookie` is `true` and value is in `translationHashes`)
 *   3. Accept-Language header (serverless only; strict match against `configuredLocales`)
 *   4. `configLocale`
 *
 * This is the pure resolution step — it does not write any cookie. Use the
 * rendering service's `resolveLocale` when you also need the Set-Cookie header.
 */
export const resolveRequestLocale = (args: ResolveRequestLocaleArgs): string => {
  const {
    request,
    userSettingLocale,
    configLocale,
    configuredLocales,
    translationHashes,
    isServerless,
    allowLocaleCookie,
  } = args;

  if (userSettingLocale && translationHashes[userSettingLocale]) {
    return userSettingLocale;
  }

  if (allowLocaleCookie) {
    const cookieLocale = readCookie(getHeader(request, 'cookie'), KBN_LOCALE_COOKIE_NAME);
    if (cookieLocale && translationHashes[cookieLocale]) {
      return cookieLocale;
    }
  }

  if (isServerless) {
    const headerLocale = pickFromAcceptLanguage(
      getHeader(request, 'accept-language'),
      configuredLocales
    );
    if (headerLocale && translationHashes[headerLocale]) {
      return headerLocale;
    }
  }

  return configLocale;
};

const getHeader = (request: KibanaRequest, name: string): string => {
  const value = request.headers[name];
  if (Array.isArray(value)) return value.join(',');
  return typeof value === 'string' ? value : '';
};

/**
 * Returns the value of the named cookie from a `Cookie` header, or
 * `undefined` if absent.
 */
export const readCookie = (cookieHeader: string, name: string): string | undefined => {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    if (key !== name) continue;
    let value = pair.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

/**
 * Walks a weighted Accept-Language header and returns the highest-weight
 * entry that is a strict (case-insensitive) match in `allowed`.
 */
export const pickFromAcceptLanguage = (
  header: string,
  allowed: readonly string[]
): string | undefined => {
  if (!header || allowed.length === 0) return undefined;

  const allowedByLowerCase = new Map<string, string>();
  for (const id of allowed) {
    allowedByLowerCase.set(id.toLowerCase(), id);
  }

  const entries = header
    .split(',')
    .map((raw): { locale: string; q: number } | undefined => {
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      const [tag, ...params] = trimmed.split(';');
      const locale = tag.trim().toLowerCase();
      if (!locale || locale === '*') return undefined;
      let q = 1;
      for (const param of params) {
        const [k, v] = param.split('=').map((s) => s.trim());
        if (k === 'q' && v) {
          const parsed = parseFloat(v);
          if (!isNaN(parsed)) q = parsed;
        }
      }
      return { locale, q };
    })
    .filter((entry): entry is { locale: string; q: number } => !!entry && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { locale } of entries) {
    const match = allowedByLowerCase.get(locale);
    if (match) return match;
  }
  return undefined;
};
