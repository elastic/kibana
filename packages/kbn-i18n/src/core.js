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

import IntlMessageFormat from 'intl-messageformat';
import memoizeIntlConstructor from 'intl-format-cache';

const EN_LOCALE = 'en';

const getMessageById = (messages, id) =>
  id.split('.').reduce((val, key) => (val ? val[key] : null), messages);

const hasValues = values => Object.keys(values).length > 0;

const addLocaleData = localeData => {
  if (localeData && localeData.locale) {
    IntlMessageFormat.__addLocaleData(localeData);
  }
};

const normalizeLocale = (locale = '') => locale.toLowerCase().replace('_', '-');

const showError = error => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }
};

const getMessageFormat = memoizeIntlConstructor(IntlMessageFormat);

export default class I18n {
  constructor(messages = {}, locale = messages.locale || EN_LOCALE) {
    this.currentLocale = normalizeLocale(locale);
    this.messages = { [this.currentLocale]: messages };
    this.defaultLocale = EN_LOCALE;
    this.formats = {};

    if (messages.localeData) {
      addLocaleData(messages.localeData);
    }
  }

  addMessages(messages = {}, locale = messages.locale || EN_LOCALE) {
    const normalizedLocale = normalizeLocale(locale);

    this.messages[normalizedLocale] = {
      ...this.messages[normalizedLocale],
      ...messages,
    };

    if (messages.localeData) {
      addLocaleData(messages.localeData);
    }
  }

  getMessages() {
    return this.messages[this.currentLocale];
  }

  setLocale(locale) {
    this.currentLocale = normalizeLocale(locale);
  }

  getLocale() {
    return this.currentLocale;
  }

  setDefaultLocale(locale) {
    this.defaultLocale = normalizeLocale(locale);
  }

  getDefaultLocale() {
    return this.defaultLocale;
  }

  defineFormats(formats) {
    this.formats = formats;
  }

  getFormats() {
    return this.formats;
  }

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
