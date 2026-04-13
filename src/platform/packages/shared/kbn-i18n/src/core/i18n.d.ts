import type { MessageDescriptor, Formatters } from '@formatjs/intl';
import type { Translation, TranslationInput } from '../translation';
import type { FormatXMLElementFn, PrimitiveType } from './types';
export declare const getIsInitialized: () => boolean;
/**
 * Provides a way to register translations with the engine
 */
export declare function activateTranslation(newTranslation: TranslationInput): void;
/**
 * Returns messages for the current language
 */
export declare function getTranslation(): Translation;
/**
 * Returns the current locale
 * Shortcut to getTranslation().locale
 */
export declare function getLocale(): string;
type MessageFormatters = Pick<Formatters, 'getNumberFormat' | 'getDateTimeFormat' | 'getPluralRules'>;
export interface TranslateArguments {
    /**
     * Will be used unless translation was successful
     */
    defaultMessage: MessageDescriptor['defaultMessage'];
    /**
     * Message description, used by translators and other devs to understand the message context.
     */
    description?: MessageDescriptor['description'];
    /**
     * values to pass into translation
     */
    values?: Record<string, PrimitiveType | FormatXMLElementFn<string, string>>;
    /**
     * Whether to treat HTML/XML tags as string literal
     * instead of parsing them as tag token.
     * When this is false we only allow simple tags without
     * any attributes
     */
    ignoreTag?: boolean;
    /**
     * Custom formatters to override the default intl formatters
     */
    formatters?: MessageFormatters;
}
/**
 * Translate message by id
 * @param id - translation id to be translated
 * @param [options]
 * @param [options.values] - values to pass into translation
 * @param [options.defaultMessage] - will be used unless translation was successful
 * @param [options.description] - message description, used by translators and other devs to understand the message context.
 * @param [options.ignoreTag] - Whether to treat HTML/XML tags as string literal instead of parsing them as tag token. When this is false we only allow simple tags without any attributes
 * @param [options.formatters] - Custom formatters to override the default intl formatters
 */
export declare function translate(id: string, { values, description, defaultMessage, ignoreTag, formatters }: TranslateArguments): string;
/**
 * Formats a list of values using the current locale.
 * @param type - The type of list formatting (e.g., 'conjunction', 'disjunction', 'unit').
 * @param value - The array of string values to format.
 * @returns The formatted list string.
 */
export declare function formatList(type: 'conjunction' | 'disjunction' | 'unit', value: string[]): string;
/**
 * Initializes the engine
 * @param newTranslation
 */
export declare function init(newTranslation?: TranslationInput): void;
/**
 * Loads JSON with translations from the specified URL and initializes i18n engine with them.
 * @param translationsUrl URL pointing to the JSON bundle with translations.
 */
export declare function load(translationsUrl: string): Promise<void>;
export {};
