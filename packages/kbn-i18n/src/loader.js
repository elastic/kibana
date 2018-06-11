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

/**
 * Abstraction that helps to load, parse and supply
 * localization messages to i18n engine
 */
export class I18nLoader {
  static TRANSLATION_FILE_EXTENSION = '.json';

  /**
   * Registers passed translations files, loads them and returns promise with
   * all translation messages
   * @param {string[]} paths - Array of absolute paths to the translation files
   * @returns {Promise<Map<string, Messages>>} translations - A Promise object
   * where keys are the locale and values are objects of translation messages
   */
  static async getAllTranslationsFromPaths(paths) {
    const i18nLoader = new I18nLoader();

    i18nLoader.registerTranslationFiles(paths);

    return await i18nLoader.getAllTranslations();
  }

  /**
   * Returns locale by the given translation file name
   * @param {string} fullFileName
   * @returns {string} locale
   * @example
   * getLocaleFromFileName('./path/to/translation/ru.json') // => 'ru'
   */
  static getLocaleFromFileName(fullFileName) {
    if (!fullFileName) {
      throw new Error('Filename is empty');
    }

    const fileExt = path.extname(fullFileName);

    if (fileExt !== I18nLoader.TRANSLATION_FILE_EXTENSION) {
      throw new Error(
        `Translations must have 'json' extension. File being registered is ${fullFileName}`
      );
    }

    return path.basename(fullFileName, I18nLoader.TRANSLATION_FILE_EXTENSION);
  }

  /**
   * Loads file and parses it as JSON5
   * @param {string} pathToFile
   * @returns {Promise<object>}
   */
  static async loadFile(pathToFile) {
    return JSON5.parse(await asyncReadFile(pathToFile, 'utf8'));
  }

  /**
   * Internal property for storing registered translations paths
   * @private
   * @type {Map<string, string[]>|{}} - Key is locale, value is array of registered paths
   */
  _translationsRegistry = {};

  /**
   * Internal property for caching loaded translations files
   * @private
   * @type {Map<string, Messages>|{}} - Key is path to translation file, value is
   * object with translation messages
   */
  _loadedFiles = {};

  /**
   * Registers translation file with i18n loader
   * @param {string} pluginTranslationFilePath - Absolute path to the translation file to register.
   */
  registerTranslationFile(pluginTranslationFilePath) {
    if (!path.isAbsolute(pluginTranslationFilePath)) {
      throw new TypeError(
        'Paths to translation files must be absolute. ' +
          `Got relative path: "${pluginTranslationFilePath}"`
      );
    }

    const locale = I18nLoader.getLocaleFromFileName(pluginTranslationFilePath);

    this._translationsRegistry[locale] = unique([
      ...(this._translationsRegistry[locale] || []),
      pluginTranslationFilePath,
    ]);
  }

  /**
   * Registers array of translation files with i18n loader
   * @param {string[]} arrayOfPaths - Array of absolute paths to the translation files to register.
   */
  registerTranslationFiles(arrayOfPaths = []) {
    arrayOfPaths.forEach(this.registerTranslationFile.bind(this));
  }

  /**
   * Returns an array of locales that have been registered with i18n loader
   * @returns {string[]} registeredTranslations
   */
  getRegisteredLocales() {
    return Object.keys(this._translationsRegistry);
  }

  /**
   * Returns translations for a suitable locale based on accept-language header.
   * This object will contain all registered translations for the highest priority
   * locale which is registered with the i18n loader. This object can be empty
   * if no locale in the language tags can be matched against the registered locales.
   * @param {string} header - accept-language header from an HTTP request
   * @returns {Promise<Messages>} translations - translation messages
   */
  async getTranslationsByLanguageHeader(header) {
    return this.getTranslationsByLocale(
      this._pickLocaleByLanguageHeader(header)
    );
  }

  /**
   * Returns translation messages by specified locale
   * @param {string} locale
   * @returns {Promise<Messages>} translations - translation messages
   */
  async getTranslationsByLocale(locale) {
    const files = this._translationsRegistry[locale] || [];
    const notLoadedFiles = files.filter(file => !this._loadedFiles[file]);

    if (notLoadedFiles.length) {
      await this._loadAndCacheFiles(notLoadedFiles);
    }

    return files.length
      ? files.reduce(
          (messages, file) => ({
            ...messages,
            ...this._loadedFiles[file],
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
  async getAllTranslations() {
    const locales = this.getRegisteredLocales();
    const translations = await Promise.all(
      locales.map(locale => this.getTranslationsByLocale(locale))
    );

    return locales.reduce(
      (acc, locale, index) => ({
        ...acc,
        [locale]: translations[index],
      }),
      {}
    );
  }

  /**
   * Parses the accept-language header from an HTTP request and picks
   * the best match of the locale from the registered locales
   * @private
   * @param {string} header - accept-language header from an HTTP request
   * @returns {string} locale
   */
  _pickLocaleByLanguageHeader(header) {
    return pick(this.getRegisteredLocales(), header);
  }

  /**
   * Loads translations files and adds them into "_loadedFiles" cache
   * @private
   * @param {string[]} files
   * @returns {Promise<void>}
   */
  async _loadAndCacheFiles(files) {
    const translations = await Promise.all(files.map(I18nLoader.loadFile));

    this._loadedFiles = files.reduce(
      (loadedFiles, file, index) => ({
        ...loadedFiles,
        [file]: translations[index],
      }),
      this._loadedFiles
    );
  }
}
