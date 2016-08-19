import fs from 'fs';
import Promise from 'bluebird';

const readFile = Promise.promisify(fs.readFile);

const TRANSLATION_FILE_EXTENSION = 'json';

let registeredTranslations = {};

const getRegisteredTranslationLocales = function () {
  return Object.keys(registeredTranslations);
};

const registerTranslations = function (absolutePluginTranslationFilePath) {
  let translationFiles = [];

  const locale = getLocaleFromFileName(absolutePluginTranslationFilePath);
  if (registeredTranslations.hasOwnProperty(locale)) {
    translationFiles = registeredTranslations[locale];
  }
  translationFiles.push(absolutePluginTranslationFilePath);
  registeredTranslations[locale] = translationFiles;
};

const getRegisteredLocaleTranslations = function (locale) {
  if (!registeredTranslations.hasOwnProperty(locale)) {
    throw new Error('No translations registered for locale: ' + locale);
  }

  const translationFiles = registeredTranslations[locale];
  let translationJson = {};

  return Promise.map(translationFiles, (translationFile) => {
    return readFile(translationFile, 'utf8').then(function (translationStr) {
      const translationToAddJson = JSON.parse(translationStr);
      for (let key in translationToAddJson) {
        if (translationToAddJson.hasOwnProperty(key)) {
          const attrName = key;
          const attrValue = translationToAddJson[key];
          translationJson[attrName] = attrValue;
        }
      }
    });
  }).then(function () {
    return translationJson;
  });
};

function getFileName(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

function getLocaleFromFileName(fullFileName) {
  const fileName = getFileName(fullFileName);
  const fileExt = fileName.split('.').pop();

  if (fileName === fileExt) return null;
  if (fileExt !== TRANSLATION_FILE_EXTENSION) return null;
  const locale  = fileName.substr(0, fileName.lastIndexOf('.'));
  return locale;
}

/**
 * The translation file is registered with i18n plugin. The plugin contains a list of registered translation file paths per language.
 * @param {string} absolutePluginTranslationFilePath - Absolute path to the translation file to register.
 */
module.exports.registerTranslations = registerTranslations;
/**
 * Return all translations registered for a particular locale. If a translation is unavailable for the locale then default locale is used.
 * @param {string} locale - Translation locale to be returned
 * @return {Promise} - A Promise object which will contain on resolve a JSON object of all registered translations
 */
module.exports.getRegisteredLocaleTranslations = getRegisteredLocaleTranslations;
/**
 * Returns list of all registered locales.
 * @return {list} - Registered locales
 */
module.exports.getRegisteredTranslationLocales = getRegisteredTranslationLocales;
