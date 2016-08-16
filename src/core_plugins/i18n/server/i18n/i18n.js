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

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLocaleTranslations = getRegisteredLocaleTranslations;
module.exports.getRegisteredTranslationLocales = getRegisteredTranslationLocales;
