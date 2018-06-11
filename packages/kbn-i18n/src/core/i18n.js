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

import IntlMessageFormat from 'intl-messageformat';
import IntlRelativeFormat from 'intl-relativeformat';
import memoizeIntlConstructor from 'intl-format-cache';

// Add all locale data to `IntlMessageFormat`.
// TODO: Use dynamic import for asynchronous loading of specific locale data
import './locales';

const isString = value => typeof value === 'string';
const isObject = value => typeof value === 'object';
const hasValues = values => Object.keys(values).length > 0;

/**
 * Platform agnostic abstraction that helps to supply locale data to
 * UI frameworks and provides methods for the direct translation.
 */
export class I18n {
  static EN_LOCALE = 'en';
  static LOCALE_DELIMITER = '-';
  static getMessageFormat = memoizeIntlConstructor(IntlMessageFormat);
  static getRelativeFormat = memoizeIntlConstructor(IntlRelativeFormat);

  /**
   * Returns message by the given message id.
   * @param {Messages} messages - messages tree
   * @param {string} id - path to the message that consists of properties
   * names separated by dots
   * @returns {string} message - translated message from messages tree
   * @example
   * getMessageById({ a: { b: { c: 'test' } } }, 'a.b.c'); // => 'test'
   */
  static getMessageById(messages, id) {
    return id
      .split('.')
      .reduce((val, key) => (val ? val[key] : null), messages);
  }

  /**
   * Normalizes locale to make it consistent with IntlMessageFormat locales
   * @param {string} locale
   * @returns {string} normalizedLocale
   */
  static normalizeLocale(locale) {
    return locale.toLowerCase().replace('_', I18n.LOCALE_DELIMITER);
  }

  _defaultLocale = I18n.EN_LOCALE;
  _formats = {};
  _messages = {};

  /**
   * Creates i18n engine instance and fills messages registry with a passed messages
   * @constructor
   * @param {Messages} [messages]
   * @param {string} [locale = messages.locale]
   */
  constructor(messages = {}, locale = messages.locale) {
    this.setLocale(locale || this._defaultLocale);
    this.addMessages(messages, this._currentLocale);
    IntlMessageFormat.defaultLocale = this._defaultLocale;
    IntlRelativeFormat.defaultLocale = this._defaultLocale;
  }

  /**
   * Provides a way to register translations with the engine
   * @param {Messages} messages
   * @param {string} [locale = messages.locale]
   */
  addMessages(messages = {}, locale = messages.locale) {
    if (!locale) {
      throw new Error('[I18n] A `locale` must be provided to add messages.');
    } else {
      const normalizedLocale = I18n.normalizeLocale(locale);

      this._messages[normalizedLocale] = {
        ...this._messages[normalizedLocale],
        ...messages,
      };
    }
  }

  /**
   * Returns messages for the current language
   * @returns {Messages} messages
   */
  getMessages() {
    return this._messages[this._currentLocale];
  }

  /**
   * Tells the engine which language to use by given language key
   * @param {string} locale
   */
  setLocale(locale) {
    if (!locale || !isString(locale)) {
      throw new Error('[I18n] A `locale` must be non-empty string.');
    } else {
      this._currentLocale = I18n.normalizeLocale(locale);
    }
  }

  /**
   * Returns the current locale
   * @returns {string} locale
   */
  getLocale() {
    return this._currentLocale;
  }

  /**
   * Tells the library which language to fallback when missing translations
   * @param {string} locale
   */
  setDefaultLocale(locale) {
    if (!locale || !isString(locale)) {
      throw new Error('[I18n] A `locale` must be non-empty string.');
    } else {
      this._defaultLocale = I18n.normalizeLocale(locale);
      IntlMessageFormat.defaultLocale = this._defaultLocale;
      IntlRelativeFormat.defaultLocale = this._defaultLocale;
    }
  }

  /**
   * Returns the default locale
   * @returns {string} defaultLocale
   */
  getDefaultLocale() {
    return this._defaultLocale;
  }

  /**
   * Supplies a set of options to the underlying formatter
   * @param {object} formats
   */
  setFormats(formats) {
    if (!isObject(formats) || !hasValues(formats)) {
      throw new Error('[I18n] A `formats` must be non-empty object.');
    } else {
      this._formats = formats;
    }
  }

  /**
   * Returns current formats
   * @returns {object} formats
   */
  getFormats() {
    return this._formats;
  }

  /**
   * Returns array of locales having translations
   * @returns {string[]} locales
   */
  getRegisteredLocales() {
    return Object.keys(this._messages);
  }

  /**
   * Translate message by id
   * @param {string} id - translation id to be translated
   * @param {object} [options]
   * @param {object} [options.values] - values to pass into translation
   * @param {string} [options.defaultMessage] - will be used unless translation was successful
   * @returns {string}
   */
  translate(id, { values = {}, defaultMessage = '' } = {}) {
    if (!id) {
      throw new Error(
        '[I18n] An `id` must be provided to translate a message.'
      );
    }

    const message = I18n.getMessageById(this.getMessages(), id);

    if (!hasValues(values) && process.env.NODE_ENV === 'production') {
      return message || defaultMessage || id;
    }

    if (message) {
      try {
        const msg = I18n.getMessageFormat(
          message,
          this.getLocale(),
          this.getFormats()
        );

        return msg.format(values);
      } catch (e) {
        throw new Error(
          `[I18n] Error formatting message: "${id}" for locale: "${this.getLocale()}".\n${e}`
        );
      }
    } else if (defaultMessage) {
      try {
        const msg = I18n.getMessageFormat(
          defaultMessage,
          this.getDefaultLocale(),
          this.getFormats()
        );

        return msg.format(values);
      } catch (e) {
        throw new Error(
          `[I18n] Error formatting the default message for: "${id}".\n${e}`
        );
      }
    } else {
      throw new Error(
        `[I18n] Cannot format message: "${id}". Default message must be provided.`
      );
    }
  }
}

export const i18n = new I18n();
