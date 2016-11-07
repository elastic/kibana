import path from 'path';
import Promise from 'bluebird';
import { readFile } from 'fs';
import _ from 'lodash';

const asyncReadFile = Promise.promisify(readFile);

const TRANSLATION_FILE_EXTENSION = '.json';

let i18nConfig = null;
let registeredTranslations = {};

/**
 * Return all translations registered for a particular locale.
 * @param {string} locale - Translation locale to be returned
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForLocale(locale) {
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

/**
 * Return all translations registered for the default locale.
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForDefaultLocale() {
  let defaultLocale = '';
  try {
    defaultLocale = i18nConfig.get('i18n.locale');
  } catch (e) {
    defaultLocale = 'en';
  }
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
export function getTranslationsForPriorityLocaleFromLocaleList(languageTags) {
  let locale = '';

  if (!_.isEmpty(languageTags)) {
    const registeredLocales = getRegisteredTranslationLocales();
    locale = getTranslationLocaleExactMatch(languageTags, registeredLocales) ||
      getTranslationLocaleBestCaseMatch(languageTags, registeredLocales) || '';
  }

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
 * Set the i18n configuration
 * @param {Object} i18n module confioguration object
 */
export function setI18nConfig(config) {
  i18nConfig = config;
}

function getLocaleFromFileName(fullFileName) {
  if (_.isEmpty(fullFileName)) throw new Error('Filename empty');

  const fileExt = path.extname(fullFileName);
  if (fileExt.length <= 0 || fileExt !== TRANSLATION_FILE_EXTENSION) {
    throw new Error('Translations must be in a JSON file. File being registered is ' + fullFileName);
  }

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}

function getTranslationLocaleExactMatch(languageTags, registeredLocales) {
  return  _.find(languageTags, (tag) => _.contains(registeredLocales, tag));
}

function getTranslationLocaleBestCaseMatch(languageTags, registeredLocales) {
  // Find the first registered locale that begins with one of the language codes from the provided language tags.
  // For example, if there is an 'en' language code, it would match an 'en-US' registered locale.
  const languageCodes = _.map(languageTags, (tag) => _.first(tag.split('-'))) || [];
  return _.find(languageCodes, (code) => {
    return _.find(registeredLocales, (locale) => _.startsWith(locale, code));
  });
}
