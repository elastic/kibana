/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const LOCALE_IDS = ['en', 'fr-FR', 'ja-JP', 'zh-CN', 'de-DE'] as const;

/**
 * A supported locale code (e.g., `"en"`, `"fr-FR"`).
 */
export type SupportedLocaleId = (typeof LOCALE_IDS)[number];

/**
 * List of all locales that are officially supported by Kibana.
 * Widened to `readonly string[]` so it can be used with `Array.prototype.includes`
 * and similar methods that take an unnarrowed string argument.
 */
export const SUPPORTED_LOCALE_IDS: readonly string[] = LOCALE_IDS;

/**
 * Supported locales with human-readable labels.
 */
export const SUPPORTED_LOCALES: ReadonlyArray<{ id: SupportedLocaleId; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'fr-FR', label: 'Français' },
  { id: 'ja-JP', label: '日本語' },
  { id: 'zh-CN', label: '中文' },
  { id: 'de-DE', label: 'Deutsch' },
];

/**
 * Returns the canonical-casing supported locale id matching the given locale string,
 * or `"en"` if no match is found. The i18n engine lowercases locales internally
 * (so `fr-FR` becomes `fr-fr`), but UI options and persistence expect canonical
 * casing (`fr-FR`).
 */
export const toCanonicalLocaleId = (locale: string): SupportedLocaleId => {
  const lc = locale.toLowerCase();
  return SUPPORTED_LOCALES.find(({ id }) => id.toLowerCase() === lc)?.id ?? 'en';
};
