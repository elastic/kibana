import * as i18n from './i18n';

/**
 * Return all translations registered for a particular locale.
 * @param {string} locale - Translation locale to be returned
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForLocale(locale) {
  return i18n.getTranslationsForLocale(locale);
};

/**
 * Return all translations registered for the default locale.
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForDefaultLocale() {
  return i18n.getTranslationsForDefaultLocale();
};

/**
 * Returns list of all registered locales.
 * @return {Array} - Registered locales
 */
export function getRegisteredTranslationLocales() {
  return i18n.getRegisteredTranslationLocales();
};

/**
 * Return translations for a suitable locale from a user side locale list
 * @param {Sring} languageTags -  BCP 47 language tags
 * @return {Object} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForPriorityLocaleFromLocaleList(languageTags) {
  return i18n.getTranslationsForPriorityLocaleFromLocaleList(languageTags);
};

/**
 * The translation file is registered with i18n plugin. The plugin contains a list of registered translation file paths per language.
 * @param {string} absolutePluginTranslationFilePath - Absolute path to the translation file to register.
 */
export function registerTranslations(absolutePluginTranslationFilePath) {
  return i18n.registerTranslations(absolutePluginTranslationFilePath);
};

export function setI18nConfig(config) {
  return i18n.setI18nConfig(config);
};
