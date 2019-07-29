import { Translation } from '../translation';
import { Formats } from './formats';
import './locales.js';
/**
 * Provides a way to register translations with the engine
 * @param newTranslation
 * @param [locale = messages.locale]
 */
export declare function addTranslation(newTranslation: Translation, locale?: string | undefined): void;
/**
 * Returns messages for the current language
 */
export declare function getTranslation(): Translation;
/**
 * Tells the engine which language to use by given language key
 * @param locale
 */
export declare function setLocale(locale: string): void;
/**
 * Returns the current locale
 */
export declare function getLocale(): string;
/**
 * Tells the library which language to fallback when missing translations
 * @param locale
 */
export declare function setDefaultLocale(locale: string): void;
export declare function getDefaultLocale(): string;
/**
 * Supplies a set of options to the underlying formatter
 * [Default format options used as the prototype of the formats]
 * {@link https://github.com/yahoo/intl-messageformat/blob/master/src/core.js#L62}
 * These are used when constructing the internal Intl.NumberFormat
 * and Intl.DateTimeFormat instances.
 * @param newFormats
 * @param [newFormats.number]
 * @param [newFormats.date]
 * @param [newFormats.time]
 */
export declare function setFormats(newFormats: Formats): void;
/**
 * Returns current formats
 */
export declare function getFormats(): Formats;
/**
 * Returns array of locales having translations
 */
export declare function getRegisteredLocales(): string[];
interface TranslateArguments {
    values?: Record<string, string | number | boolean | Date | null | undefined>;
    defaultMessage: string;
    description?: string;
}
/**
 * Translate message by id
 * @param id - translation id to be translated
 * @param [options]
 * @param [options.values] - values to pass into translation
 * @param [options.defaultMessage] - will be used unless translation was successful
 */
export declare function translate(id: string, { values, defaultMessage }: TranslateArguments): string;
/**
 * Initializes the engine
 * @param newTranslation
 */
export declare function init(newTranslation?: Translation): void;
/**
 * Loads JSON with translations from the specified URL and initializes i18n engine with them.
 * @param translationsUrl URL pointing to the JSON bundle with translations.
 */
export declare function load(translationsUrl: string): Promise<void>;
export {};
//# sourceMappingURL=i18n.d.ts.map