import { readFile } from 'fs';
import path from 'path';
import Promise from 'bluebird';
import _ from 'lodash';

const asyncReadFile = Promise.promisify(readFile);

const TRANSLATION_FILE_EXTENSION = '.json';

let registeredTranslations = {};

/**
 * Return all translations registered for a particular locale.
 * @param {string} locale - Translation locale to be returned
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
const getTranslationsForLocale = function (locale) {
  if (!registeredTranslations.hasOwnProperty(locale)) {
    return new Promise(function (resolve, reject) {
      return null;
    });
  }

  const translationFiles = registeredTranslations[locale];
  const translations = _.map(translationFiles, (filename) => {
    return asyncReadFile(filename, 'utf8').then(fileContents => JSON.parse(fileContents)).catch(SyntaxError, function (e) {
      return Promise.reject('Invalid json in ' + filename);
    }).catch(function (e) {
      return Promise.reject('Cannot read file ' + filename);
    });
  });

  return Promise.all(translations).then(translations => _.assign({}, ...translations)).then(function (translations) {
    const vals = Object.values(translations);
    if (!vals.every(isString)) return  Promise.reject('Invalid json schema for translations');
    return translations;
  });
};

/**
 * Returns list of all registered locales.
 * @return {Array} - Registered locales
 */
const getRegisteredTranslationLocales = function () {
  return Object.keys(registeredTranslations);
};

/**
 * Return translations for a suitable locale from a user side locale list
 * @param {string} acceptLanguages - List of accept languages/locales from user side
 * @param {string} defaultLocale - Default locale as configured in Kibana
 * @return {object} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
const getTranslationsForLocales = function (acceptLanguages, defaultLocale) {
  let locale = '';

  if (acceptLanguages !== null && acceptLanguages.length > 0) {
    const registeredLocales = getRegisteredTranslationLocales();
    locale = getTranslationLocaleExactMatch(acceptLanguages, registeredLocales);
    if (locale === null || locale.length <= 0) {
      locale = getTranslationLocaleBestCaseMatch(acceptLanguages, registeredLocales, defaultLocale);
    }
  } else {
    locale = defaultLocale;
  }

  return getTranslationsForLocale(locale);
};

/**
 * The translation file is registered with i18n plugin. The plugin contains a list of registered translation file paths per language.
 * @param {string} absolutePluginTranslationFilePath - Absolute path to the translation file to register.
 */
const registerTranslations = function (absolutePluginTranslationFilePath) {
  const locale = getLocaleFromFileName(absolutePluginTranslationFilePath);

  registeredTranslations[locale] = _.get(registeredTranslations, locale, []).concat(absolutePluginTranslationFilePath);
};

function getLocaleFromFileName(fullFileName) {
  if (fullFileName === null || fullFileName.length <= 0) return '';

  const fileExt = path.extname(fullFileName);
  if (fileExt.length <= 0) return '';
  if (fileExt !== TRANSLATION_FILE_EXTENSION) return '';

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}

function isString(element, index, array) {
  return typeof element === 'string';
}

function getTranslationLocaleExactMatch(acceptLanguages, registeredLocales) {
  let localeStr = '';

  const acceptLangsLen = acceptLanguages.length;
  for (let indx = 0; indx < acceptLangsLen; indx++) {
    const language = acceptLanguages[indx];
    if (language.region) {
      localeStr = language.code + '-' + language.region;
    } else {
      localeStr = language.code;
    }
    if (registeredLocales.indexOf(localeStr) > -1) {
      return localeStr;
    }
  }
  return null;
}

function getTranslationLocaleBestCaseMatch(acceptLanguages, registeredLocales, defaultLocale) {
  let localeStr = '';

  const acceptLangsLen = acceptLanguages.length;
  const regLangsLen = registeredLocales.length;
  for (let indx = 0; indx < acceptLangsLen; indx++) {
    const language = acceptLanguages[indx];
    localeStr = language.code;
    for (let regIndx = 0; regIndx < regLangsLen; regIndx++) {
      const locale = registeredLocales[regIndx];
      if (locale.match('^' + localeStr)) {
        return locale;
      }
    }
  }
  return defaultLocale;
}

export { getTranslationsForLocale, getTranslationsForLocales, getRegisteredTranslationLocales, registerTranslations };
