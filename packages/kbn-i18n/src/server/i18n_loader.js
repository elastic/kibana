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

import path from 'path';
import { readFile } from 'fs';
import { promisify } from 'util';
import { pick } from 'accept-language-parser';

const asyncReadFile = promisify(readFile);

export class I18nLoader {
  static TRANSLATION_FILE_EXTENSION = '.json';

  static unique(arr = []) {
    return arr.filter((value, index, array) => array.indexOf(value) === index);
  }

  static getLocaleFromFileName(fullFileName) {
    if (!fullFileName) {
      throw new Error('Filename is empty');
    }

    const fileExt = path.extname(fullFileName);

    if (fileExt !== I18nLoader.TRANSLATION_FILE_EXTENSION) {
      throw new Error(
        `Translations must be in a JSON file. File being registered is ${fullFileName}`
      );
    }

    return path.basename(fullFileName, I18nLoader.TRANSLATION_FILE_EXTENSION);
  }

  static async loadFile(pathToFile) {
    return JSON.parse(await asyncReadFile(pathToFile, 'utf8'));
  }

  /**
   * Internal property for storing registered translations paths
   * @private
   * @type {Map<string, string[]>|{}} - Key is locale, value is array of registered paths
   */
  translationsRegistry = {};

  /**
   * Internal property for caching loaded translations files
   * @private
   * @type {Map<string, object>|{}} - Key is path to translation file, value is
   * object with translation messages
   */
  loadedFiles = {};

  /**
   * The translation file is registered with i18n plugin.
   * The plugin contains a list of registered translation file paths per language.
   * @param {String} pluginTranslationFilePath - Absolute path to the translation file to register.
   */
  registerTranslationFile(pluginTranslationFilePath) {
    if (!path.isAbsolute(pluginTranslationFilePath)) {
      throw new TypeError(
        'Paths to translation files must be absolute. ' +
          `Got relative path: "${pluginTranslationFilePath}"`
      );
    }

    const locale = I18nLoader.getLocaleFromFileName(pluginTranslationFilePath);

    this.translationsRegistry[locale] = I18nLoader.unique([
      ...(this.translationsRegistry[locale] || []),
      pluginTranslationFilePath,
    ]);
  }

  registerTranslationFiles(arrayOfPaths = []) {
    arrayOfPaths.forEach(this.registerTranslationFile.bind(this));
  }

  getRegisteredTranslations() {
    return Object.keys(this.translationsRegistry);
  }

  pickLocaleByLanguageHeader(header) {
    return pick(this.getRegisteredTranslations(), header);
  }

  /**
   * Return translations for a suitable locale from a user side locale list
   * @param {...string} languageTags -  BCP 47 language tags. The tags are listed in priority order as set in the Accept-Language header.
   * @returns {Promise<Object>} translations - promise for an object where
   *                                           keys are translation keys and
   *                                           values are translations
   * This object will contain all registered translations for the highest priority locale which is registered with the i18n module.
   * This object can be empty if no locale in the language tags can be matched against the registered locales.
   */
  async getTranslationsByLanguageHeader(header) {
    return this.getTranslationsByLocale(
      this.pickLocaleByLanguageHeader(header)
    );
  }

  /**
   * Returns translation messages by specified locale
   * @param locale
   * @returns {Promise<object>}
   */
  async getTranslationsByLocale(locale) {
    const files = this.translationsRegistry[locale] || [];
    const notLoadedFiles = files.filter(file => !this.loadedFiles[file]);

    if (notLoadedFiles.length) {
      await this.loadAndCacheFiles(notLoadedFiles);
    }

    return files.length
      ? files.reduce(
          (messages, file) => ({
            ...messages,
            ...this.loadedFiles[file],
          }),
          { locale }
        )
      : {};
  }

  /**
   * Returns all translations for registered locales
   * @return {Promise<object>} translations - A Promise object where keys are
   * the locale and values are Objects of translation keys and translations
   */
  async getAllTranslations() {
    const locales = this.getRegisteredTranslations();
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
   * Loads translations files and adds them into "loadedFiles" cache
   * @private
   * @param {string[]} files
   * @returns {Promise<void>}
   */
  async loadAndCacheFiles(files) {
    const translations = await Promise.all(files.map(I18nLoader.loadFile));

    this.loadedFiles = files.reduce(
      (loadedFiles, file, index) => ({
        ...loadedFiles,
        [file]: translations[index],
      }),
      this.loadedFiles
    );
  }
}
