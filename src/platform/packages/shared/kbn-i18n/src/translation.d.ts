import type { IntlShape, CustomFormats } from '@formatjs/intl';
export interface TranslationInput {
    /**
     * Actual translated messages.
     */
    messages: IntlShape['messages'];
    /**
     * Locale of the translated messages.
     */
    locale: IntlShape['locale'];
    /**
     * Set of options to the underlying formatter.
     */
    formats?: CustomFormats;
}
export interface Translation extends TranslationInput {
    /**
     * Default locale to fall back to when the translation is not found for the message id.
     * Hardcoded to `en` for Kibana.
     */
    defaultLocale: IntlShape['defaultLocale'];
    /**
     * default formatter formats.
     */
    defaultFormats: IntlShape['formats'];
}
