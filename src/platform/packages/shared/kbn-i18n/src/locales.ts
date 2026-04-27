/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const KNOWN_LOCALE_IDS = ['en', 'fr-FR', 'ja-JP', 'zh-CN', 'de-DE'] as const;

/**
 * A supported locale code (e.g., `"en"`, `"fr-FR"`). Widened to `string` so
 * deployments can configure additional locales via `kibana.yml` (`i18n.locales`)
 * — for instance, plugins shipping their own translation files.
 */
export type SupportedLocaleId = string;

/**
 * Default list of locale ids Kibana ships translations for. Used as the
 * default value of `i18n.locales` in the config schema and as a fallback
 * when there is no runtime configuration available (e.g., test fixtures,
 * Storybook). It is **not** an authoritative runtime allow-list — admins
 * can curate or extend the list via `kibana.yml`.
 */
export const SUPPORTED_LOCALE_IDS: readonly string[] = KNOWN_LOCALE_IDS;

/**
 * Friendly labels for the locales Kibana ships translations for. Used as
 * a label registry: when the configured `i18n.locales` includes a known
 * id, the picker shows the friendly label; for unknown ids the picker
 * falls back to the id itself.
 */
export const SUPPORTED_LOCALES: ReadonlyArray<{ id: SupportedLocaleId; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'fr-FR', label: 'Français' },
  { id: 'ja-JP', label: '日本語' },
  { id: 'zh-CN', label: '中文' },
  { id: 'de-DE', label: 'Deutsch' },
];

/**
 * Returns the friendly label for a known locale id, or the id itself when
 * no label is registered (e.g., admin-installed custom locales).
 */
export const getLocaleLabel = (id: SupportedLocaleId): string => {
  const lc = id.toLowerCase();
  return SUPPORTED_LOCALES.find((entry) => entry.id.toLowerCase() === lc)?.label ?? id;
};

/**
 * Returns the canonical-casing locale id matching the given locale string
 * against the supplied list (or the known-locales registry when no list is
 * provided), or `"en"` if no match is found. The i18n engine lowercases
 * locales internally (so `fr-FR` becomes `fr-fr`), but UI options and
 * persistence expect canonical casing (`fr-FR`).
 */
export const toCanonicalLocaleId = (
  locale: string,
  availableLocales: ReadonlyArray<{ id: string }> = SUPPORTED_LOCALES
): SupportedLocaleId => {
  const lc = locale.toLowerCase();
  return availableLocales.find(({ id }) => id.toLowerCase() === lc)?.id ?? 'en';
};

/**
 * A locale that the running Kibana instance offers in the language picker.
 */
export interface AvailableLocale {
  id: SupportedLocaleId;
  label: string;
}

let availableLocales: ReadonlyArray<AvailableLocale> = [];

/**
 * Sets the list of locales the current Kibana instance offers in the
 * language picker. Called once during browser bootstrap with the values
 * the server derived from `i18n.locales`. An empty list means the picker
 * UI is disabled for this deployment.
 */
export const setAvailableLocales = (locales: ReadonlyArray<AvailableLocale>): void => {
  availableLocales = locales.map(({ id, label }) => ({ id, label }));
};

/**
 * Returns the list of locales the current Kibana instance offers in the
 * language picker. Returns an empty array if `setAvailableLocales` has not
 * been called or if the deployment has disabled the picker.
 */
export const getAvailableLocales = (): ReadonlyArray<AvailableLocale> => availableLocales;
