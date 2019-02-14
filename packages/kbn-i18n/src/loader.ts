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

import { readFile } from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { unique } from './core/helper';
import { Translation } from './translation';

const asyncReadFile = promisify(readFile);

const TRANSLATION_FILE_EXTENSION = '.json';

/**
 * Internal property for storing registered translations paths.
 * Key is locale, value is array of registered paths
 */
const translationsRegistry: { [key: string]: string[] } = {};

/**
 * Internal property for caching loaded translations files.
 * Key is path to translation file, value is object with translation messages
 */
const loadedFiles: { [key: string]: Translation } = {};

/**
 * Returns locale by the given translation file name
 * @param fullFileName
 * @returns locale
 * @example
 * getLocaleFromFileName('./path/to/translation/ru.json') // => 'ru'
 */
function getLocaleFromFileName(fullFileName: string) {
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
 * Loads file and parses it as JSON
 * @param pathToFile
 * @returns
 */
async function loadFile(pathToFile: string): Promise<Translation> {
  return JSON.parse(await asyncReadFile(pathToFile, 'utf8'));
}

/**
 * Loads translations files and adds them into "loadedFiles" cache
 * @param files
 * @returns
 */
async function loadAndCacheFiles(files: string[]) {
  const translations = await Promise.all(files.map(loadFile));

  files.forEach((file, index) => {
    loadedFiles[file] = translations[index];
  });
}

/**
 * Registers translation file with i18n loader
 * @param translationFilePath - Absolute path to the translation file to register.
 */
export function registerTranslationFile(translationFilePath: string) {
  if (!path.isAbsolute(translationFilePath)) {
    throw new TypeError(
      'Paths to translation files must be absolute. ' +
        `Got relative path: "${translationFilePath}"`
    );
  }

  const locale = getLocaleFromFileName(translationFilePath);

  translationsRegistry[locale] = unique([
    ...(translationsRegistry[locale] || []),
    translationFilePath,
  ]);
}

/**
 * Registers array of translation files with i18n loader
 * @param arrayOfPaths - Array of absolute paths to the translation files to register.
 */
export function registerTranslationFiles(arrayOfPaths: string[] = []) {
  arrayOfPaths.forEach(registerTranslationFile);
}

/**
 * Returns an array of locales that have been registered with i18n loader
 * @returns registeredTranslations
 */
export function getRegisteredLocales() {
  return Object.keys(translationsRegistry);
}

/**
 * Returns translation messages by specified locale
 * @param locale
 * @returns translation messages
 */
export async function getTranslationsByLocale(locale: string): Promise<Translation> {
  const files = translationsRegistry[locale] || [];
  const notLoadedFiles = files.filter(file => !loadedFiles[file]);

  if (notLoadedFiles.length) {
    await loadAndCacheFiles(notLoadedFiles);
  }

  if (!files.length) {
    return { messages: {} };
  }

  return files.reduce(
    (translation: Translation, file) => ({
      locale: loadedFiles[file].locale || translation.locale,
      formats: loadedFiles[file].formats || translation.formats,
      messages: {
        ...loadedFiles[file].messages,
        ...translation.messages,
      },
    }),
    { locale, messages: {} }
  );
}

/**
 * Returns all translations for registered locales
 * @returns A Promise object
 * where keys are the locale and values are objects of translation messages
 */
export async function getAllTranslations(): Promise<{ [key: string]: Translation }> {
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
 * @param paths - Array of absolute paths to the translation files
 * @returns A Promise object where
 * keys are the locale and values are objects of translation messages
 */
export async function getAllTranslationsFromPaths(paths: string[]) {
  registerTranslationFiles(paths);

  return await getAllTranslations();
}
