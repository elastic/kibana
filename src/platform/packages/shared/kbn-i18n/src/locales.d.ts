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
export declare const SUPPORTED_LOCALE_IDS: readonly string[];
/**
 * Returns the friendly label for a locale id, using `Intl.DisplayNames`
 * in the **endonym** pattern: each locale is rendered in its own
 * language (`fr-FR` → `"français"`, `ja-JP` → `"日本語"`). This means a
 * user stuck in a language they cannot read still sees their preferred
 * language listed in a script they recognise.
 *
 * Region is dropped before lookup so the label is the bare language
 * name, following each language's own orthographic conventions (French
 * does not capitalise language names; English and German do).
 *
 * Falls back to the locale id when `Intl.DisplayNames` is unavailable
 * (e.g., minimal-ICU Node builds) or cannot resolve the locale.
 */
export declare const getLocaleLabel: (id: SupportedLocaleId) => string;
/**
 * Returns the canonical-casing locale id matching the given locale string
 * against the supplied list (or the bundled known-locale list when no
 * list is provided), or `"en"` if no match is found. The i18n engine
 * lowercases locales internally (so `fr-FR` becomes `fr-fr`), but UI
 * options and persistence expect canonical casing (`fr-FR`).
 */
export declare const toCanonicalLocaleId: (locale: string, availableLocales?: ReadonlyArray<{
    id: string;
}>) => SupportedLocaleId;
/**
 * A locale that the running Kibana instance offers in the language picker.
 */
export interface AvailableLocale {
    id: SupportedLocaleId;
    label: string;
}
/**
 * Sets the list of locales the current Kibana instance offers in the
 * language picker. Called once during browser bootstrap with the values
 * the server derived from `i18n.locales`. An empty list means the picker
 * UI is disabled for this deployment.
 */
export declare const setAvailableLocales: (locales: ReadonlyArray<AvailableLocale>) => void;
/**
 * Returns the list of locales the current Kibana instance offers in the
 * language picker. Returns an empty array if `setAvailableLocales` has not
 * been called or if the deployment has disabled the picker.
 */
export declare const getAvailableLocales: () => ReadonlyArray<AvailableLocale>;
