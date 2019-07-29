"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerTranslationFile = registerTranslationFile;
exports.registerTranslationFiles = registerTranslationFiles;
exports.getRegisteredLocales = getRegisteredLocales;
exports.getTranslationsByLocale = getTranslationsByLocale;
exports.getAllTranslations = getAllTranslations;
exports.getAllTranslationsFromPaths = getAllTranslationsFromPaths;

var _fs = require("fs");

var path = _interopRequireWildcard(require("path"));

var _util = require("util");

var _helper = require("./core/helper");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const asyncReadFile = (0, _util.promisify)(_fs.readFile);
const TRANSLATION_FILE_EXTENSION = '.json';
/**
 * Internal property for storing registered translations paths.
 * Key is locale, value is array of registered paths
 */

const translationsRegistry = {};
/**
 * Internal property for caching loaded translations files.
 * Key is path to translation file, value is object with translation messages
 */

const loadedFiles = {};
/**
 * Returns locale by the given translation file name
 * @param fullFileName
 * @returns locale
 * @example
 * getLocaleFromFileName('./path/to/translation/ru.json') // => 'ru'
 */

function getLocaleFromFileName(fullFileName) {
  if (!fullFileName) {
    throw new Error('Filename is empty');
  }

  const fileExt = path.extname(fullFileName);

  if (fileExt !== TRANSLATION_FILE_EXTENSION) {
    throw new Error(`Translations must have 'json' extension. File being registered is ${fullFileName}`);
  }

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}
/**
 * Loads file and parses it as JSON
 * @param pathToFile
 * @returns
 */


async function loadFile(pathToFile) {
  return JSON.parse((await asyncReadFile(pathToFile, 'utf8')));
}
/**
 * Loads translations files and adds them into "loadedFiles" cache
 * @param files
 * @returns
 */


async function loadAndCacheFiles(files) {
  const translations = await Promise.all(files.map(loadFile));
  files.forEach((file, index) => {
    loadedFiles[file] = translations[index];
  });
}
/**
 * Registers translation file with i18n loader
 * @param translationFilePath - Absolute path to the translation file to register.
 */


function registerTranslationFile(translationFilePath) {
  if (!path.isAbsolute(translationFilePath)) {
    throw new TypeError('Paths to translation files must be absolute. ' + `Got relative path: "${translationFilePath}"`);
  }

  const locale = getLocaleFromFileName(translationFilePath);
  translationsRegistry[locale] = (0, _helper.unique)([...(translationsRegistry[locale] || []), translationFilePath]);
}
/**
 * Registers array of translation files with i18n loader
 * @param arrayOfPaths - Array of absolute paths to the translation files to register.
 */


function registerTranslationFiles(arrayOfPaths = []) {
  arrayOfPaths.forEach(registerTranslationFile);
}
/**
 * Returns an array of locales that have been registered with i18n loader
 * @returns registeredTranslations
 */


function getRegisteredLocales() {
  return Object.keys(translationsRegistry);
}
/**
 * Returns translation messages by specified locale
 * @param locale
 * @returns translation messages
 */


async function getTranslationsByLocale(locale) {
  const files = translationsRegistry[locale] || [];
  const notLoadedFiles = files.filter(file => !loadedFiles[file]);

  if (notLoadedFiles.length) {
    await loadAndCacheFiles(notLoadedFiles);
  }

  if (!files.length) {
    return {
      messages: {}
    };
  }

  return files.reduce((translation, file) => ({
    locale: loadedFiles[file].locale || translation.locale,
    formats: loadedFiles[file].formats || translation.formats,
    messages: _objectSpread({}, loadedFiles[file].messages, translation.messages)
  }), {
    locale,
    messages: {}
  });
}
/**
 * Returns all translations for registered locales
 * @returns A Promise object
 * where keys are the locale and values are objects of translation messages
 */


async function getAllTranslations() {
  const locales = getRegisteredLocales();
  const translations = await Promise.all(locales.map(getTranslationsByLocale));
  return locales.reduce((acc, locale, index) => _objectSpread({}, acc, {
    [locale]: translations[index]
  }), {});
}
/**
 * Registers passed translations files, loads them and returns promise with
 * all translation messages
 * @param paths - Array of absolute paths to the translation files
 * @returns A Promise object where
 * keys are the locale and values are objects of translation messages
 */


async function getAllTranslationsFromPaths(paths) {
  registerTranslationFiles(paths);
  return await getAllTranslations();
}