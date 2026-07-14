import type { KibanaRequest } from '@kbn/core-http-server';
/**
 * Name of the browser-side cookie used to remember the resolved locale across
 * authenticated and anonymous renders. Written on every render with whatever
 * locale Kibana resolved, so the cookie tracks profile changes automatically.
 */
export declare const KBN_LOCALE_COOKIE_NAME = "KBN_LOCALE";
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
export declare const resolveLocale: (args: ResolveLocaleArgs) => ResolveLocaleResult;
/**
 * Returns the value of the named cookie from a `Cookie` header, or
 * `undefined` if absent. Handles common edge cases (whitespace, quoted
 * values, multiple cookies) without pulling in a parser dep.
 */
export declare const readCookie: (cookieHeader: string, name: string) => string | undefined;
/**
 * Walks a weighted Accept-Language header and returns the highest-weight
 * servable candidate, matched case-insensitively (exact, else primary-subtag
 * fallback). Returns `undefined` if no entry yields a servable candidate.
 * Entries with `q=0` are ignored.
 */
export declare const pickFromAcceptLanguage: (header: string, allowed: readonly string[], translationHashes: Record<string, string>) => string | undefined;
