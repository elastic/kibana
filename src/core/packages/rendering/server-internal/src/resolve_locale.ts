/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { EN_LOCALE } from '@kbn/i18n';

/**
 * Name of the browser-side cookie used to remember the resolved locale across
 * authenticated and anonymous renders. Written on every render with whatever
 * locale Kibana resolved, so the cookie tracks profile changes automatically.
 */
export const KBN_LOCALE_COOKIE_NAME = 'KBN_LOCALE';

/** One year in seconds, used as the cookie's Max-Age. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface ResolveLocaleArgs {
  request: KibanaRequest;
  /** Locale saved on the user's profile, if any. */
  userSettingLocale: string | undefined;
  /** Server-configured default (i18n.defaultLocale). */
  configLocale: string;
  /** Configured allow-list (i18n.locales). Used for Accept-Language matching. */
  configuredLocales: readonly string[];
  /** Map of locale id → translation hash for locales we can serve. */
  translationHashes: Record<string, string>;
  /** Server-wide base path for the cookie's Path attribute. */
  serverBasePath: string;
  /**
   * When false, the `KBN_LOCALE` cookie is neither read from the request nor
   * written to the response. Controlled by `i18n.allowLocaleCookie`.
   */
  allowLocaleCookie: boolean;
}

export interface ResolveLocaleResult {
  /** Locale id Kibana should render the response in. */
  locale: string;
  /**
   * Ready-to-use Set-Cookie header value (e.g. `KBN_LOCALE=fr-FR; Path=/; ...`).
   * Always present — the cookie is rewritten on every render.
   */
  setCookieHeader: string;
}

/**
 * Resolves the effective locale for a render using the following priority chain:
 *   1. User profile setting (when value is in `translationHashes`)
 *   2. KBN_LOCALE cookie (only when `allowLocaleCookie` is `true` and value is in `translationHashes`)
 *   3. Explicitly-configured `configLocale` (any `i18n.defaultLocale` other than the built-in `en`)
 *   4. Accept-Language header (exact match against `configuredLocales`, else language-level (region-optional) fallback)
 *   5. `configLocale` (the built-in `en` default)
 */
export const resolveLocale = (args: ResolveLocaleArgs): ResolveLocaleResult => {
  const {
    request,
    userSettingLocale,
    configLocale,
    configuredLocales,
    translationHashes,
    serverBasePath,
    allowLocaleCookie,
  } = args;

  if (userSettingLocale && translationHashes[userSettingLocale]) {
    return finalize(userSettingLocale, request, serverBasePath);
  }

  if (allowLocaleCookie) {
    const cookieLocale = readCookie(getHeader(request, 'cookie'), KBN_LOCALE_COOKIE_NAME);
    if (cookieLocale && translationHashes[cookieLocale]) {
      return finalize(cookieLocale, request, serverBasePath);
    }
  }

  // An explicitly-configured default locale (any value other than the built-in
  // EN_LOCALE) outranks Accept-Language detection.
  if (configLocale !== EN_LOCALE) {
    return finalize(configLocale, request, serverBasePath);
  }

  const headerLocale = pickFromAcceptLanguage(
    getHeader(request, 'accept-language'),
    configuredLocales,
    translationHashes
  );
  if (headerLocale) {
    return finalize(headerLocale, request, serverBasePath);
  }

  return finalize(configLocale, request, serverBasePath);
};

const getHeader = (request: KibanaRequest, name: string): string => {
  const value = request.headers[name];
  if (Array.isArray(value)) return value.join(',');
  return typeof value === 'string' ? value : '';
};

/**
 * Returns the value of the named cookie from a `Cookie` header, or
 * `undefined` if absent. Handles common edge cases (whitespace, quoted
 * values, multiple cookies) without pulling in a parser dep.
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
 * servable candidate, matched case-insensitively (exact, else primary-subtag
 * fallback). Returns `undefined` if no entry yields a servable candidate.
 * Entries with `q=0` are ignored.
 */
export const pickFromAcceptLanguage = (
  header: string,
  allowed: readonly string[],
  translationHashes: Record<string, string>
): string | undefined => {
  if (!header || allowed.length === 0) return undefined;

  const allowedByLowerCase = new Map<string, string>();
  // Primary subtag → first configured locale with that subtag (config order
  // wins ties).
  const allowedByPrimarySubtag = new Map<string, string>();
  for (const id of allowed) {
    const lower = id.toLowerCase();
    allowedByLowerCase.set(lower, id);
    const primary = lower.split('-')[0];
    if (!allowedByPrimarySubtag.has(primary)) {
      allowedByPrimarySubtag.set(primary, id);
    }
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
    const exact = allowedByLowerCase.get(locale);
    if (exact && translationHashes[exact]) return exact;
    // No exact match: fall back to a configured locale sharing the primary
    // subtag, regardless of region (`fr-CH` may resolve to `fr-FR`).
    const primary = locale.split('-')[0];
    const fallback = allowedByPrimarySubtag.get(primary);
    if (fallback && translationHashes[fallback]) return fallback;
  }
  return undefined;
};

const finalize = (
  locale: string,
  request: KibanaRequest,
  serverBasePath: string
): ResolveLocaleResult => {
  const isHttps = request.url.protocol === 'https:';
  const path = serverBasePath || '/';
  const parts = [
    `${KBN_LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    `Path=${path}`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (isHttps) parts.push('Secure');
  return {
    locale,
    setCookieHeader: parts.join('; '),
  };
};
