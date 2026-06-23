import { formatList, getLocale, getTranslation, init, load, translate } from './src/core';
import { registerTranslationFile, registerTranslationFiles, getTranslationsByLocale, getAllTranslations, getAllTranslationsFromPaths, getRegisteredLocales as getRegisteredLocalesForLoader } from './src/loader';
declare const i18n: {
    getTranslation: typeof getTranslation;
    getLocale: typeof getLocale;
    translate: typeof translate;
    formatList: typeof formatList;
    init: typeof init;
    load: typeof load;
    handleIntlError: import("@formatjs/intl").OnErrorFn;
    getIsInitialized: () => boolean;
};
declare const i18nLoader: {
    registerTranslationFile: typeof registerTranslationFile;
    registerTranslationFiles: typeof registerTranslationFiles;
    getTranslationsByLocale: typeof getTranslationsByLocale;
    getAllTranslations: typeof getAllTranslations;
    getAllTranslationsFromPaths: typeof getAllTranslationsFromPaths;
    getRegisteredLocales: typeof getRegisteredLocalesForLoader;
};
export type { Translation, TranslationInput } from './src/translation';
export type { Formats, TranslateArguments } from './src/core';
export { SUPPORTED_LOCALE_IDS, getLocaleLabel, toCanonicalLocaleId, setAvailableLocales, getAvailableLocales, } from './src/locales';
export type { AvailableLocale, SupportedLocaleId } from './src/locales';
export { i18n, i18nLoader };
