/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 @typedef Messages - messages tree, where leafs are translated strings
 @type {object<string, object>}
 @property {string} [locale] - locale of the messages
 */

import path from 'path';
import { readFile } from 'fs';
import { promisify } from 'util';
import { pick } from 'accept-language-parser';
import JSON5 from 'json5';

const asyncReadFile = promisify(readFile);

const unique = (arr = []) =>
  arr.filter((value, index, array) => array.indexOf(value) === index);

const TRANSLATION_FILE_EXTENSION = '.json';

/**
 * Internal property for storing registered translations paths
 * @type {Map<string, string[]>|{}} - Key is locale, value is array of registered paths
 */
const translationsRegistry = {};

/**
 * Internal property for caching loaded translations files
 * @type {Map<string, Messages>|{}} - Key is path to translation file, value is
 * object with translation messages
 */
const loadedFiles = {};

/**
 * Returns locale by the given translation file name
 * @param {string} fullFileName
 * @returns {string} locale
 * @example
 * getLocaleFromFileName('./path/to/translation/ru.json') // => 'ru'
 */
function getLocaleFromFileName(fullFileName) {
  if (!fullFileName) {
    throw new Error('Filename is empty');
  }

  const fileExt = path.extname(fullFileName);

  if (fileExt !== TRANSLATION_FILE_EXTENSION) {
    throw new Error(
      `Translations must have 'json' extension. File being registered is ${fullFileName}`
    );
  }

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}

/**
 * Loads file and parses it as JSON5
 * @param {string} pathToFile
 * @returns {Promise<object>}
 */
async function loadFile(pathToFile) {
  return JSON5.parse(await asyncReadFile(pathToFile, 'utf8'));
}

/**
 * Parses the accept-language header from an HTTP request and picks
 * the best match of the locale from the registered locales
 * @param {string} header - accept-language header from an HTTP request
 * @returns {string} locale
 */
function pickLocaleByLanguageHeader(header) {
  return pick(getRegisteredLocales(), header);
}

/**
 * Loads translations files and adds them into "loadedFiles" cache
 * @param {string[]} files
 * @returns {Promise<void>}
 */
async function loadAndCacheFiles(files) {
  const translations = await Promise.all(files.map(loadFile));

  files.forEach((file, index) => {
    loadedFiles[file] = translations[index];
  });
}

/**
 * Registers translation file with i18n loader
 * @param {string} pluginTranslationFilePath - Absolute path to the translation file to register.
 */
export function registerTranslationFile(pluginTranslationFilePath) {
  if (!path.isAbsolute(pluginTranslationFilePath)) {
    throw new TypeError(
      'Paths to translation files must be absolute. ' +
        `Got relative path: "${pluginTranslationFilePath}"`
    );
  }

  const locale = getLocaleFromFileName(pluginTranslationFilePath);

  translationsRegistry[locale] = unique([
    ...(translationsRegistry[locale] || []),
    pluginTranslationFilePath,
  ]);
}

/**
 * Registers array of translation files with i18n loader
 * @param {string[]} arrayOfPaths - Array of absolute paths to the translation files to register.
 */
export function registerTranslationFiles(arrayOfPaths = []) {
  arrayOfPaths.forEach(registerTranslationFile);
}

/**
 * Returns an array of locales that have been registered with i18n loader
 * @returns {string[]} registeredTranslations
 */
export function getRegisteredLocales() {
  return Object.keys(translationsRegistry);
}

/**
 * Returns translations for a suitable locale based on accept-language header.
 * This object will contain all registered translations for the highest priority
 * locale which is registered with the i18n loader. This object can be empty
 * if no locale in the language tags can be matched against the registered locales.
 * @param {string} header - accept-language header from an HTTP request
 * @returns {Promise<Messages>} translations - translation messages
 */
export async function getTranslationsByLanguageHeader(header) {
  return getTranslationsByLocale(pickLocaleByLanguageHeader(header));
}

/**
 * Returns translation messages by specified locale
 * @param {string} locale
 * @returns {Promise<Messages>} translations - translation messages
 */
export async function getTranslationsByLocale(locale) {
  const files = translationsRegistry[locale] || [];
  const notLoadedFiles = files.filter(file => !loadedFiles[file]);

  if (notLoadedFiles.length) {
    await loadAndCacheFiles(notLoadedFiles);
  }

  return files.length
    ? files.reduce(
        (messages, file) => ({
          ...messages,
          ...loadedFiles[file],
        }),
        { locale }
      )
    : {};
}

/**
 * Returns all translations for registered locales
 * @return {Promise<Map<string, Messages>>} translations - A Promise object
 * where keys are the locale and values are objects of translation messages
 */
export async function getAllTranslations() {
  const locales = getRegisteredLocales();
  const translations = await Promise.all(locales.map(getTranslationsByLocale));

  return locales.reduce(
    (acc, locale, index) => ({
      ...acc,
      [locale]: translations[index],
    }),
    {}
  );
}

/**
 * Registers passed translations files, loads them and returns promise with
 * all translation messages
 * @param {string[]} paths - Array of absolute paths to the translation files
 * @returns {Promise<Map<string, Messages>>} translations - A Promise object
 * where keys are the locale and values are objects of translation messages
 */
export async function getAllTranslationsFromPaths(paths) {
  registerTranslationFiles(paths);

  return await getAllTranslations();
}
