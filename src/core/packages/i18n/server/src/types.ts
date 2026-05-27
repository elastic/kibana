/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AvailableLocale } from '@kbn/i18n';

/**
 * Arguments accepted by {@link RequestI18nClient.translate}.
 * @public
 */
export interface ServerTranslateArgs {
  /**
   * Will be used when no translation for `id` is found.
   */
  defaultMessage: string;
  /**
   * Values to interpolate into the message.
   */
  values?: Record<string, string | number | boolean>;
  /**
   * Description for translators.
   */
  description?: string;
  /**
   * When true, XML/HTML tags in the message are treated as literal text.
   */
  ignoreTag?: boolean;
}

/**
 * A per-request i18n client that translates strings in the locale resolved for
 * the current HTTP request. Accessible via `(await context.core).i18n`.
 *
 * All methods are async because locale resolution (user profile lookup) happens
 * on first call and is memoised for the lifetime of the request.
 *
 * @public
 */
export interface RequestI18nClient {
  /**
   * Returns the locale resolved for this request (e.g. `'fr-FR'`).
   */
  getLocale(): Promise<string>;

  /**
   * Translates the message identified by `id` using this request's locale.
   * Falls back to `defaultMessage` when the locale has no entry for `id`.
   */
  translate(id: string, args: ServerTranslateArgs): Promise<string>;

  /**
   * Formats a list of values using this request's locale.
   */
  formatList(type: 'conjunction' | 'disjunction' | 'unit', values: string[]): Promise<string>;
}

/**
 * The i18n context available on `(await context.core).i18n` inside a route
 * handler. Identical to {@link RequestI18nClient}.
 *
 * @public
 */
export type I18nRequestHandlerContext = RequestI18nClient;

/**
 * @public
 */
export interface I18nServiceSetup {
  /**
   * Return the server's default locale, as configured by `i18n.defaultLocale`
   * (or the deprecated `i18n.locale`).
   */
  getLocale(): string;

  /**
   * Return the locales the deployment offers in the language picker, as
   * configured by `i18n.locales`. Returns an empty array when the picker
   * is disabled (i.e., `i18n.locales: []`).
   */
  getLocales(): readonly string[];

  /**
   * Return the available locales paired with their display labels. Suitable
   * for rendering language pickers; returns an empty array when the picker
   * is disabled.
   */
  getAvailableLocales(): ReadonlyArray<AvailableLocale>;

  /**
   * Return the absolute paths to translation files currently in use.
   */
  getTranslationFiles(): string[];

  /**
   * Returns the hash generated from the current translations.
   */
  getTranslationHash(): string;

  /**
   * Returns a map of locale ID to translation content hash for all configured locales.
   */
  getTranslationHashes(): Record<string, string>;

  /**
   * When `true`, Kibana writes a `KBN_LOCALE` cookie on every rendered
   * response so the browser remembers the resolved locale across page loads,
   * anonymous pages, and post-logout browsing. Controlled by
   * `i18n.allowLocaleCookie` in `kibana.yml`. Defaults to `true`.
   */
  allowLocaleCookie: boolean;
}
