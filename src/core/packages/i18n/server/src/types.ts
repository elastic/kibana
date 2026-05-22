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
}
