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
 @typedef Messages
 @type {object<string, object>}
 @property {string} [locale] - locale of the messages
 @property {object} [localeData] - localization rules for IntlMessageFormat
 */

import IntlMessageFormat from 'intl-messageformat';
import memoizeIntlConstructor from 'intl-format-cache';

const getMessageById = (messages, id) =>
  id.split('.').reduce((val, key) => (val ? val[key] : null), messages);

const hasValues = values => Object.keys(values).length > 0;

const addLocaleData = localeData => {
  if (localeData && localeData.locale) {
    IntlMessageFormat.__addLocaleData(localeData);
  }
};

const showError = error => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }
};

const getMessageFormat = memoizeIntlConstructor(IntlMessageFormat);

export class I18n {
  static EN_LOCALE = 'en';
  static LOCALE_DELIMITER = '-';

  static normalizeLocale(locale = '') {
    return locale.toLowerCase().replace('_', I18n.LOCALE_DELIMITER);
  }

  /**
   * Platform agnostic abstraction that helps to supply locale data to
   * UI frameworks and provides methods for the direct translation.
   * @param {Messages} messages
   * @param {string} [locale = messages.locale||'en']
   */
  constructor(messages = {}, locale = messages.locale || I18n.EN_LOCALE) {
    this.currentLocale = I18n.normalizeLocale(locale);
    this.messages = { [this.currentLocale]: messages };
    this.defaultLocale = I18n.EN_LOCALE;
    this.formats = {};
    IntlMessageFormat.defaultLocale = this.defaultLocale;

    if (messages.localeData) {
      addLocaleData(messages.localeData);
    }
  }

  /**
   * Provides a way to register translations with the engine
   * @param {Messages} messages
   * @param {string} [locale = messages.locale||'en']
   */
  addMessages(messages = {}, locale = messages.locale || I18n.EN_LOCALE) {
    const normalizedLocale = I18n.normalizeLocale(locale);

    this.messages[normalizedLocale] = {
      ...this.messages[normalizedLocale],
      ...messages,
    };

    if (messages.localeData) {
      addLocaleData(messages.localeData);
    }
  }

  /**
   * Returns messages for the current language
   * @returns {Messages} messages
   */
  getMessages() {
    return this.messages[this.currentLocale];
  }

  /**
   * Tells the engine which language to use by given language key
   * @param {string} locale
   */
  setLocale(locale) {
    this.currentLocale = I18n.normalizeLocale(locale);
  }

  /**
   * Returns the current locale
   * @returns {string} locale
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Tells the library which language to fallback when missing translations
   * @param {string} locale
   */
  setDefaultLocale(locale) {
    this.defaultLocale = I18n.normalizeLocale(locale);
    IntlMessageFormat.defaultLocale = this.defaultLocale;
  }

  /**
   * Returns the default locale
   * @returns {string} defaultLocale
   */
  getDefaultLocale() {
    return this.defaultLocale;
  }

  /**
   * Supplies a set of options to the underlying formatter
   * @param {object} formats
   */
  setFormats(formats) {
    this.formats = formats;
  }

  /**
   * Returns current formats
   * @returns {object} formats
   */
  getFormats() {
    return this.formats;
  }

  /**
   * Returns array of locales having translations
   * @returns {string[]} locales
   */
  getRegisteredLocales() {
    return Object.keys(this.messages);
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
      showError('[I18n] An `id` must be provided to translate a message.');
    }

    const message = getMessageById(this.getMessages(), id);

    if (!hasValues(values) && process.env.NODE_ENV === 'production') {
      return message || defaultMessage || id;
    }

    let formattedMessage;

    if (message) {
      try {
        const msg = getMessageFormat(
          message,
          this.getLocale(),
          this.getFormats()
        );

        formattedMessage = msg.format(values);
      } catch (e) {
        showError(
          `[I18n] Error formatting message: "${id}" for locale: "${this.getLocale()}"` +
            (defaultMessage ? ', using default message as fallback.' : '') +
            `\n${e}`
        );
      }
    } else {
      if (!defaultMessage || this.getLocale() !== this.getDefaultLocale()) {
        showError(
          `[I18n] Missing message: "${id}" for locale: "${this.getLocale()}"` +
            (defaultMessage ? ', using default message as fallback.' : '')
        );
      }
    }

    if (!formattedMessage && defaultMessage) {
      try {
        const msg = getMessageFormat(
          defaultMessage,
          this.getDefaultLocale(),
          this.getFormats()
        );

        formattedMessage = msg.format(values);
      } catch (e) {
        showError(
          `[I18n] Error formatting the default message for: "${id}"\n${e}`
        );
      }
    }

    if (!formattedMessage) {
      showError(
        `[I18n] Cannot format message: "${id}", ` +
          `using message ${
            message || defaultMessage ? 'source' : 'id'
          } as fallback.`
      );
    }

    return formattedMessage || message || defaultMessage || id;
  }
}

export const i18n = new I18n();
