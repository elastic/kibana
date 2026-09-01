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
  pickFromAcceptLanguage,
  readCookie,
  resolveLocale,
  type ResolveLocaleArgs,
} from './resolve_locale';

const buildRequest = ({
  cookie,
  acceptLanguage,
  protocol = 'http:',
}: {
  cookie?: string;
  acceptLanguage?: string;
  protocol?: 'http:' | 'https:';
} = {}): KibanaRequest => {
  const headers: Record<string, string> = {};
  if (cookie !== undefined) headers.cookie = cookie;
  if (acceptLanguage !== undefined) headers['accept-language'] = acceptLanguage;
  return {
    headers,
    url: { protocol },
  } as unknown as KibanaRequest;
};

const baseArgs = (overrides: Partial<ResolveLocaleArgs> = {}): ResolveLocaleArgs => ({
  request: buildRequest(),
  userSettingLocale: undefined,
  configLocale: 'en',
  configuredLocales: ['en', 'fr-FR', 'ja-JP'],
  translationHashes: { en: 'h1', 'fr-FR': 'h2', 'ja-JP': 'h3' },
  serverBasePath: '',
  allowLocaleCookie: true,
  ...overrides,
});

describe('resolveLocale', () => {
  describe('priority chain', () => {
    it('uses the user profile setting when valid', () => {
      const result = resolveLocale(
        baseArgs({
          userSettingLocale: 'ja-JP',
          request: buildRequest({ cookie: `${KBN_LOCALE_COOKIE_NAME}=fr-FR` }),
        })
      );
      expect(result.locale).toBe('ja-JP');
    });

    it('ignores a profile setting that has no translations available', () => {
      const result = resolveLocale(
        baseArgs({
          userSettingLocale: 'de-AT',
          request: buildRequest({ cookie: `${KBN_LOCALE_COOKIE_NAME}=fr-FR` }),
        })
      );
      // Falls through to cookie since profile value is not in translationHashes.
      expect(result.locale).toBe('fr-FR');
    });

    it('uses the cookie when profile is absent and cookie is valid', () => {
      const result = resolveLocale(
        baseArgs({ request: buildRequest({ cookie: `${KBN_LOCALE_COOKIE_NAME}=fr-FR` }) })
      );
      expect(result.locale).toBe('fr-FR');
    });

    it('ignores a cookie value with no translations available', () => {
      const result = resolveLocale(
        baseArgs({ request: buildRequest({ cookie: `${KBN_LOCALE_COOKIE_NAME}=de-AT` }) })
      );
      expect(result.locale).toBe('en');
    });

    it('uses Accept-Language when profile and cookie are absent', () => {
      const result = resolveLocale(
        baseArgs({
          request: buildRequest({ acceptLanguage: 'ja-JP,en;q=0.5' }),
        })
      );
      expect(result.locale).toBe('ja-JP');
    });

    it('prefers the user profile over a matching Accept-Language header', () => {
      const result = resolveLocale(
        baseArgs({
          userSettingLocale: 'ja-JP',
          request: buildRequest({ acceptLanguage: 'fr-FR,en;q=0.5' }),
        })
      );
      expect(result.locale).toBe('ja-JP');
    });

    it('prefers the KBN_LOCALE cookie over a matching Accept-Language header', () => {
      const result = resolveLocale(
        baseArgs({
          request: buildRequest({
            cookie: `${KBN_LOCALE_COOKIE_NAME}=fr-FR`,
            acceptLanguage: 'ja-JP,en;q=0.5',
          }),
        })
      );
      expect(result.locale).toBe('fr-FR');
    });

    it('prefers an explicitly-configured non-default configLocale over a matching Accept-Language header', () => {
      const result = resolveLocale(
        baseArgs({
          configLocale: 'fr-FR',
          request: buildRequest({ acceptLanguage: 'ja-JP,en;q=0.5' }),
        })
      );
      expect(result.locale).toBe('fr-FR');
    });

    it('still prefers the user profile over an explicitly-configured non-default configLocale', () => {
      const result = resolveLocale(
        baseArgs({
          configLocale: 'fr-FR',
          userSettingLocale: 'ja-JP',
          request: buildRequest({ acceptLanguage: 'fr-FR,en;q=0.5' }),
        })
      );
      expect(result.locale).toBe('ja-JP');
    });

    it('still prefers the KBN_LOCALE cookie over an explicitly-configured non-default configLocale', () => {
      const result = resolveLocale(
        baseArgs({
          configLocale: 'fr-FR',
          request: buildRequest({ cookie: `${KBN_LOCALE_COOKIE_NAME}=ja-JP` }),
        })
      );
      expect(result.locale).toBe('ja-JP');
    });

    it('falls through to configLocale when no Accept-Language entry matches the configured allow-list', () => {
      const result = resolveLocale(
        baseArgs({
          configuredLocales: ['en', 'fr-FR'],
          translationHashes: { en: 'h1', 'fr-FR': 'h2' },
          request: buildRequest({ acceptLanguage: 'de-DE;q=1,it-IT;q=0.5' }),
        })
      );
      expect(result.locale).toBe('en');
    });

    it('falls back to a configured locale sharing the primary subtag despite a region mismatch', () => {
      const result = resolveLocale(
        baseArgs({
          configuredLocales: ['en', 'fr-FR'],
          translationHashes: { en: 'h1', 'fr-FR': 'h2' },
          request: buildRequest({ acceptLanguage: 'fr-CH;q=1,it-IT;q=0.5' }),
        })
      );
      // fr-CH falls back to fr-FR — we don't ship region-specific bundles.
      expect(result.locale).toBe('fr-FR');
    });

    it('walks the Accept-Language list and picks the first allowed entry', () => {
      const result = resolveLocale(
        baseArgs({
          request: buildRequest({ acceptLanguage: 'fr-CH;q=1,fr-FR;q=0.9,en;q=0.5' }),
        })
      );
      expect(result.locale).toBe('fr-FR');
    });

    it('resolves a bare Accept-Language tag to a configured regional locale', () => {
      const result = resolveLocale(
        baseArgs({
          configuredLocales: ['en', 'fr-FR'],
          translationHashes: { en: 'h1', 'fr-FR': 'h2' },
          request: buildRequest({ acceptLanguage: 'fr' }),
        })
      );
      // Bare `fr` falls back to the configured `fr-FR`.
      expect(result.locale).toBe('fr-FR');
    });

    it('falls through to configLocale when a bare-tag fallback lacks servable translations', () => {
      const result = resolveLocale(
        baseArgs({
          configuredLocales: ['en', 'fr-FR'],
          translationHashes: { en: 'h1' }, // 'fr-FR' missing on purpose
          configLocale: 'en',
          request: buildRequest({ acceptLanguage: 'fr' }),
        })
      );
      // `fr` resolves to `fr-FR`, but the guard rejects it (no hash).
      expect(result.locale).toBe('en');
    });

    it('ignores an Accept-Language match that is configured but missing from translationHashes', () => {
      // Edge case: a locale is in i18n.locales (so configuredLocales has it)
      // but translationHashes is missing it (e.g. translation file failed
      // to load). The Accept-Language path must gate on translationHashes
      // the same way the profile and cookie paths do.
      const result = resolveLocale(
        baseArgs({
          configuredLocales: ['en', 'fr-FR'],
          translationHashes: { en: 'h1' }, // 'fr-FR' missing on purpose
          configLocale: 'en',
          request: buildRequest({ acceptLanguage: 'fr-FR,en;q=0.5' }),
        })
      );
      expect(result.locale).toBe('en');
    });

    it('ignores the KBN_LOCALE cookie when allowLocaleCookie is false', () => {
      const result = resolveLocale(
        baseArgs({
          allowLocaleCookie: false,
          request: buildRequest({ cookie: `${KBN_LOCALE_COOKIE_NAME}=ja-JP` }),
          configLocale: 'en',
        })
      );
      expect(result.locale).toBe('en');
    });

    it('still respects the user profile locale when allowLocaleCookie is false', () => {
      const result = resolveLocale(
        baseArgs({
          allowLocaleCookie: false,
          userSettingLocale: 'fr-FR',
          request: buildRequest({ cookie: `${KBN_LOCALE_COOKIE_NAME}=ja-JP` }),
        })
      );
      expect(result.locale).toBe('fr-FR');
    });

    it('still resolves from Accept-Language when allowLocaleCookie is false', () => {
      // The Accept-Language step is independent of the cookie toggle: disabling
      // the cookie only stops Kibana from reading/writing KBN_LOCALE, it does
      // not disable browser-language detection. This is what makes anonymous /
      // signed-out pages render in the browser's language when cookies are off.
      const result = resolveLocale(
        baseArgs({
          allowLocaleCookie: false,
          request: buildRequest({ acceptLanguage: 'ja-JP,en;q=0.5' }),
        })
      );
      expect(result.locale).toBe('ja-JP');
    });

    it('falls through to configLocale when picker is disabled (i18n.locales is empty)', () => {
      const result = resolveLocale(
        baseArgs({
          configuredLocales: [],
          translationHashes: { en: 'h1' },
          configLocale: 'en',
          userSettingLocale: 'fr-FR',
          request: buildRequest({
            cookie: `${KBN_LOCALE_COOKIE_NAME}=fr-FR`,
            acceptLanguage: 'fr-FR,en;q=0.5',
          }),
        })
      );
      expect(result.locale).toBe('en');
    });
  });

  describe('Set-Cookie header', () => {
    it('always emits a Set-Cookie value matching the resolved locale', () => {
      const result = resolveLocale(baseArgs());
      expect(result.setCookieHeader).toContain(`${KBN_LOCALE_COOKIE_NAME}=en`);
    });

    it('includes Path, Max-Age, SameSite=Lax, and HttpOnly', () => {
      const result = resolveLocale(baseArgs({ serverBasePath: '/abc' }));
      expect(result.setCookieHeader).toContain('Path=/abc');
      expect(result.setCookieHeader).toContain('Max-Age=31536000');
      expect(result.setCookieHeader).toContain('SameSite=Lax');
      expect(result.setCookieHeader).toContain('HttpOnly');
    });

    it('uses Path=/ when serverBasePath is empty', () => {
      const result = resolveLocale(baseArgs({ serverBasePath: '' }));
      expect(result.setCookieHeader).toContain('Path=/');
    });

    it('adds Secure on HTTPS', () => {
      const result = resolveLocale(baseArgs({ request: buildRequest({ protocol: 'https:' }) }));
      expect(result.setCookieHeader).toContain('; Secure');
    });

    it('omits Secure on HTTP', () => {
      const result = resolveLocale(baseArgs({ request: buildRequest({ protocol: 'http:' }) }));
      expect(result.setCookieHeader).not.toContain('Secure');
    });

    it('URL-encodes non-ASCII locale ids defensively', () => {
      const result = resolveLocale(
        baseArgs({
          configLocale: 'a-Ω',
          translationHashes: { 'a-Ω': 'h' },
          configuredLocales: ['a-Ω'],
        })
      );
      expect(result.setCookieHeader).toContain(`${KBN_LOCALE_COOKIE_NAME}=a-%CE%A9`);
    });
  });
});

describe('readCookie', () => {
  it('returns undefined for an empty header', () => {
    expect(readCookie('', 'KBN_LOCALE')).toBeUndefined();
  });

  it('returns undefined when the cookie is not present', () => {
    expect(readCookie('foo=bar; baz=qux', 'KBN_LOCALE')).toBeUndefined();
  });

  it('returns the value of the named cookie', () => {
    expect(readCookie('foo=bar; KBN_LOCALE=fr-FR; baz=qux', 'KBN_LOCALE')).toBe('fr-FR');
  });

  it('handles whitespace around pairs', () => {
    expect(readCookie('  KBN_LOCALE=ja-JP  ;  foo=bar  ', 'KBN_LOCALE')).toBe('ja-JP');
  });

  it('strips surrounding double quotes from the value', () => {
    expect(readCookie('KBN_LOCALE="fr-FR"', 'KBN_LOCALE')).toBe('fr-FR');
  });

  it('decodes URL-encoded values', () => {
    expect(readCookie('KBN_LOCALE=a-%CE%A9', 'KBN_LOCALE')).toBe('a-Ω');
  });

  it('skips malformed pairs without an equals sign', () => {
    expect(readCookie('foo;KBN_LOCALE=fr-FR', 'KBN_LOCALE')).toBe('fr-FR');
  });

  it('returns undefined if decodeURIComponent throws', () => {
    // passes a string that will throw when decoded - %E0%A4%A is an incomplete UTF-8 sequence
    expect(readCookie('KBN_LOCALE=%E0%A4%A', 'KBN_LOCALE')).toBeUndefined();
  });
});

// Builds a translationHashes map treating every entry in `allowed` as servable.
const hashesFor = (allowed: readonly string[]): Record<string, string> =>
  Object.fromEntries(allowed.map((id) => [id, 'hash']));

describe('pickFromAcceptLanguage', () => {
  it('returns undefined for an empty header', () => {
    expect(pickFromAcceptLanguage('', ['en'], hashesFor(['en']))).toBeUndefined();
  });

  it('returns undefined when allowed list is empty', () => {
    expect(pickFromAcceptLanguage('en,fr-FR', [], {})).toBeUndefined();
  });

  it('returns the highest-weighted allowed entry', () => {
    expect(
      pickFromAcceptLanguage('fr-FR;q=0.5,en;q=0.9', ['en', 'fr-FR'], hashesFor(['en', 'fr-FR']))
    ).toBe('en');
  });

  it('treats missing q as 1.0', () => {
    expect(
      pickFromAcceptLanguage('fr-FR,en;q=0.5', ['en', 'fr-FR'], hashesFor(['en', 'fr-FR']))
    ).toBe('fr-FR');
  });

  it('ignores entries with q=0', () => {
    expect(
      pickFromAcceptLanguage('fr-FR;q=0,en;q=0.1', ['en', 'fr-FR'], hashesFor(['en', 'fr-FR']))
    ).toBe('en');
  });

  it('matches case-insensitively but returns the configured casing', () => {
    expect(pickFromAcceptLanguage('FR-fr', ['fr-FR'], hashesFor(['fr-FR']))).toBe('fr-FR');
  });

  it('falls back to a configured locale sharing the primary subtag despite a region mismatch', () => {
    expect(pickFromAcceptLanguage('fr-CH', ['fr-FR'], hashesFor(['fr-FR']))).toBe('fr-FR');
  });

  it('falls back from a bare tag to a configured regional locale', () => {
    expect(pickFromAcceptLanguage('fr', ['en', 'fr-FR'], hashesFor(['en', 'fr-FR']))).toBe('fr-FR');
  });

  it('returns undefined when no entry shares a primary subtag with any configured locale', () => {
    expect(
      pickFromAcceptLanguage('de', ['en', 'fr-FR'], hashesFor(['en', 'fr-FR']))
    ).toBeUndefined();
    expect(
      pickFromAcceptLanguage('de-DE', ['en', 'fr-FR'], hashesFor(['en', 'fr-FR']))
    ).toBeUndefined();
  });

  it('prefers an exact match over a primary-subtag fallback within the list', () => {
    expect(
      pickFromAcceptLanguage('fr-CA,fr-FR', ['fr-CA', 'fr-FR'], hashesFor(['fr-CA', 'fr-FR']))
    ).toBe('fr-CA');
  });

  it('prefers a higher-weight fallback over a lower-weight exact match', () => {
    // Issue example: `fr` (q=1) resolves via fallback before exact `en-US` (q=0.9).
    expect(
      pickFromAcceptLanguage('fr,en-US;q=0.9', ['fr-FR', 'en-US'], hashesFor(['fr-FR', 'en-US']))
    ).toBe('fr-FR');
  });

  it('uses a lower-priority exact match only when no primary-subtag fallback exists', () => {
    expect(pickFromAcceptLanguage('fr,en-US;q=0.9', ['en-US'], hashesFor(['en-US']))).toBe('en-US');
  });

  it('breaks fallback ambiguity by configured order', () => {
    expect(pickFromAcceptLanguage('pt', ['pt-PT', 'pt-BR'], hashesFor(['pt-PT', 'pt-BR']))).toBe(
      'pt-PT'
    );
    expect(pickFromAcceptLanguage('pt', ['pt-BR', 'pt-PT'], hashesFor(['pt-BR', 'pt-PT']))).toBe(
      'pt-BR'
    );
    expect(pickFromAcceptLanguage('pt-AO', ['pt-PT', 'pt-BR'], hashesFor(['pt-PT', 'pt-BR']))).toBe(
      'pt-PT'
    );
  });

  it('respects q-weight ordering with a primary-subtag fallback in play', () => {
    expect(
      pickFromAcceptLanguage('de;q=0.9,fr;q=1', ['de-DE', 'fr-FR'], hashesFor(['de-DE', 'fr-FR']))
    ).toBe('fr-FR');
  });

  it('skips the wildcard token', () => {
    expect(pickFromAcceptLanguage('*;q=1', ['en'], hashesFor(['en']))).toBeUndefined();
  });

  it('handles malformed q values gracefully', () => {
    expect(
      pickFromAcceptLanguage('en;q=abc,fr-FR;q=0.5', ['en', 'fr-FR'], hashesFor(['en', 'fr-FR']))
    ).toBe('en');
  });

  it('skips a matched candidate with no translation hash and continues to the next entry', () => {
    // Regression: fr-CH (q=1) falls back to fr-FR, but fr-FR has no hash
    // (translation failed to load) — must not swallow the servable ja-JP.
    expect(
      pickFromAcceptLanguage('fr-CH;q=1,ja-JP;q=0.9', ['fr-FR', 'ja-JP'], hashesFor(['ja-JP']))
    ).toBe('ja-JP');
  });

  it('returns undefined when the only matching candidate has no translation hash', () => {
    expect(pickFromAcceptLanguage('fr-CH', ['fr-FR'], {})).toBeUndefined();
  });
});
