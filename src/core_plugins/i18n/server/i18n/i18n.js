import path from 'path';
import Promise from 'bluebird';
import { readFile } from 'fs';
import _ from 'lodash';

const asyncReadFile = Promise.promisify(readFile);

const TRANSLATION_FILE_EXTENSION = '.json';

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
      return Promise.reject('Invalid json in ' + filename);
    }).catch(function (e) {
      throw new Error('Cannot read file ' + filename);
    });
  });

  return Promise.all(translations)
  .then(translations => _.assign({}, ...translations));
};

/**
 * Return all translations registered for the default locale.
 * @param {Object} server - Hapi server instance
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForDefaultLocale(server) {
  let defaultLocale = '';
  try {
    defaultLocale = server.config.get('i18n.locale');
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
 * @param {Sring} languageTags -  BCP 47 language tags
 * @return {Object} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
export function getTranslationsForLocales(languageTags) {
  let locale = '';

  if (!_.isEmpty(languageTags)) {
    const registeredLocales = getRegisteredTranslationLocales();
    locale = getTranslationLocaleExactMatch(languageTags, registeredLocales);
    if (locale === null || locale.length <= 0) {
      locale = getTranslationLocaleBestCaseMatch(languageTags, registeredLocales);
    }
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

function getLocaleFromFileName(fullFileName) {
  if (_.isEmpty(fullFileName)) throw new Error('Filename empty');

  const fileExt = path.extname(fullFileName);
  if (fileExt.length <= 0 || fileExt !== TRANSLATION_FILE_EXTENSION) throw new Error('Invalid translation file ' + fullFileName);

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}

function getTranslationLocaleExactMatch(languageTags, registeredLocales) {
  const languageTagsLen = languageTags.length;
  for (let indx = 0; indx < languageTagsLen; indx++) {
    const languageTag = languageTags[indx];
    if (registeredLocales.indexOf(languageTag) > -1) {
      return languageTag;
    }
  }
  return null;
}

function getTranslationLocaleBestCaseMatch(languageTags, registeredLocales) {
  const languageTagsLen = languageTags.length;
  const regLangsLen = registeredLocales.length;
  for (let indx = 0; indx < languageTagsLen; indx++) {
    const languageTag = languageTags[indx];
    const languageCode = languageTag.slice(0, languageTag.indexOf('-'));
    for (let regIndx = 0; regIndx < regLangsLen; regIndx++) {
      const locale = registeredLocales[regIndx];
      if (locale.match('^' + languageCode)) {
        return locale;
      }
    }
  }
  return '';
}

//export { getTranslationsForLocale, getTranslationsForDefaultLocale, getTranslationsForLocales, getRegisteredTranslationLocales, registerTranslations };
