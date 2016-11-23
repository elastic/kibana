import path from 'path';
import Promise from 'bluebird';
import { readFile } from 'fs';
import _ from 'lodash';

const asyncReadFile = Promise.promisify(readFile);

const TRANSLATION_FILE_EXTENSION = '.json';

let defaultLocale = 'en';
let registeredTranslations = {};

/**
 * Return all translations registered for the default locale.
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForDefaultLocale() {
  return getTranslationsForLocale(defaultLocale);
};

/**
 * Returns list of all registered locales.
 * @return {Array} - Registered locales
 */
export function getRegisteredTranslationLocales() {
  return Object.keys(registeredTranslations);
};

/**
 * Return translations for a suitable locale from a user side locale list
 * @param {Array<Sring>} languageTags -  BCP 47 language tags. The tags are listed in priority order as set in the Accept-Language header.
 * @return {Object} - A Promise object which will contain on resolve a JSON object.
 * This object will contain all registered translations for the highest priority locale which is registered with the i18n module.
 * This object can be empty if no locale in the language tags can be matched against the registered locales.
 */
export function getTranslations([...languageTags]) {
  const locale = getTranslationLocale(languageTags);
  return getTranslationsForLocale(locale);
};

/**
 * The translation file is registered with i18n plugin. The plugin contains a list of registered translation file paths per language.
 * @param {string} absolutePluginTranslationFilePath - Absolute path to the translation file to register.
 */
export function registerTranslations(absolutePluginTranslationFilePath) {
  const locale = getLocaleFromFileName(absolutePluginTranslationFilePath);

  registeredTranslations[locale] = _.get(registeredTranslations, locale, []).concat(absolutePluginTranslationFilePath);
};

/**
 * Unregister translation files
 */
export function unregisterTranslations() {
  registeredTranslations = {};
};

/**
 * Set the default locale
 * @param {String} locale - Locale to set
 */
export function setDefaultLocale(locale) {
  defaultLocale = locale;
}

function getTranslationsForLocale(locale) {
  if (!registeredTranslations.hasOwnProperty(locale)) {
    return Promise.resolve({});
  }

  const translationFiles = registeredTranslations[locale];
  const translations = _.map(translationFiles, (filename) => {
    return asyncReadFile(filename, 'utf8')
    .then(fileContents => JSON.parse(fileContents))
    .catch(SyntaxError, function (e) {
      throw new Error('Invalid json in ' + filename);
    })
    .catch(function (e) {
      throw new Error('Cannot read file ' + filename);
    });
  });

  return Promise.all(translations)
  .then(translations => _.assign({}, ...translations));
};

function getLocaleFromFileName(fullFileName) {
  if (_.isEmpty(fullFileName)) throw new Error('Filename empty');

  const fileExt = path.extname(fullFileName);
  if (fileExt.length <= 0 || fileExt !== TRANSLATION_FILE_EXTENSION) {
    throw new Error('Translations must be in a JSON file. File being registered is ' + fullFileName);
  }

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}

function getTranslationLocale(languageTags) {
  let locale = '';
  const registeredLocales = getRegisteredTranslationLocales();
  _.forEach(languageTags, (tag) => {
    locale = locale || getBestLocaleMatch(tag, registeredLocales);
  });
  return locale;
}

function getBestLocaleMatch(languageTag, registeredLocales) {
  if (_.contains(registeredLocales, languageTag)) {
    return languageTag;
  }

  // Find the first registered locale that begins with one of the language codes from the provided language tag.
  // For example, if there is an 'en' language code, it would match an 'en-US' registered locale.
  const languageCode = _.first(languageTag.split('-')) || [];
  return _.find(registeredLocales, (locale) => _.startsWith(locale, languageCode));
}
