/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import {
  KBN_LOCALE_COOKIE_NAME,
  readCookie,
  pickFromAcceptLanguage,
  resolveRequestLocale,
  type ResolveRequestLocaleArgs,
} from '@kbn/core-i18n-server-internal';

/** One year in seconds, used as the cookie's Max-Age. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type { ResolveRequestLocaleArgs };

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
  /**
   * When true, Accept-Language header is consulted as a fallback. Currently
   * gated to serverless deployments — non-serverless deployments stay
   * deterministic for existing users.
   */
  isServerless: boolean;
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
 *   3. Accept-Language header (serverless only; strict match against `configuredLocales`)
 *   4. `configLocale`
 */
export const resolveLocale = (args: ResolveLocaleArgs): ResolveLocaleResult => {
  const { serverBasePath, ...resolveArgs } = args;
  const locale = resolveRequestLocale(resolveArgs);
  return { locale, setCookieHeader: buildKbnLocaleCookie(locale, args.request, serverBasePath) };
};

/**
 * Builds the Set-Cookie header value for the KBN_LOCALE cookie.
 */
export const buildKbnLocaleCookie = (
  locale: string,
  request: KibanaRequest,
  serverBasePath: string
): string => {
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
  return parts.join('; ');
};

export { KBN_LOCALE_COOKIE_NAME, readCookie, pickFromAcceptLanguage };
