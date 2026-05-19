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
