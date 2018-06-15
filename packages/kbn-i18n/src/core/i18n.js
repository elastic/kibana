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
 @property {object} [formats] - set of options to the underlying formatter
 */

import IntlMessageFormat from 'intl-messageformat';
import IntlRelativeFormat from 'intl-relativeformat';
import memoizeIntlConstructor from 'intl-format-cache';
import { isString, isObject, hasValues, deepMerge } from './helper';

// Add all locale data to `IntlMessageFormat`.
// TODO: Use dynamic import for asynchronous loading of specific locale data
import './locales';

const EN_LOCALE = 'en';
const LOCALE_DELIMITER = '-';
const messages = {};
const getMessageFormat = memoizeIntlConstructor(IntlMessageFormat);

let defaultLocale = EN_LOCALE;
let currentLocale = EN_LOCALE;
let formats = {};

IntlMessageFormat.defaultLocale = defaultLocale;
IntlRelativeFormat.defaultLocale = defaultLocale;

/**
 * Returns message by the given message id.
 * @param {Messages} messages - messages tree
 * @param {string} id - path to the message that consists of properties
 * names separated by dots
 * @returns {string} message - translated message from messages tree
 * @example
 * getMessageById({ a: { b: { c: 'test' } } }, 'a.b.c'); // => 'test'
 */
function getMessageById(messages, id) {
  return id.split('.').reduce((val, key) => (val ? val[key] : null), messages);
}

/**
 * Normalizes locale to make it consistent with IntlMessageFormat locales
 * @param {string} locale
 * @returns {string} normalizedLocale
 */
function normalizeLocale(locale) {
  return locale.toLowerCase().replace('_', LOCALE_DELIMITER);
}

/**
 * Provides a way to register translations with the engine
 * @param {Messages} newMessages
 * @param {string} [locale = messages.locale]
 */
export function addMessages(newMessages = {}, locale = newMessages.locale) {
  if (!locale) {
    throw new Error('[I18n] A `locale` must be provided to add messages.');
  } else {
    const normalizedLocale = normalizeLocale(locale);

    messages[normalizedLocale] = {
      ...messages[normalizedLocale],
      ...newMessages,
    };
  }
}

/**
 * Returns messages for the current language
 * @returns {Messages} messages
 */
export function getMessages() {
  return messages[currentLocale];
}

/**
 * Tells the engine which language to use by given language key
 * @param {string} locale
 */
export function setLocale(locale) {
  if (!locale || !isString(locale)) {
    throw new Error('[I18n] A `locale` must be non-empty string.');
  } else {
    currentLocale = normalizeLocale(locale);
  }
}

/**
 * Returns the current locale
 * @returns {string} locale
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Tells the library which language to fallback when missing translations
 * @param {string} locale
 */
export function setDefaultLocale(locale) {
  if (!locale || !isString(locale)) {
    throw new Error('[I18n] A `locale` must be non-empty string.');
  } else {
    defaultLocale = normalizeLocale(locale);
    IntlMessageFormat.defaultLocale = defaultLocale;
    IntlRelativeFormat.defaultLocale = defaultLocale;
  }
}

/**
 * Returns the default locale
 * @returns {string} defaultLocale
 */
export function getDefaultLocale() {
  return defaultLocale;
}

/**
 * Supplies a set of options to the underlying formatter
 * [Default format options used as the prototype of the formats]
 * {@link https://github.com/yahoo/intl-messageformat/blob/master/src/core.js#L62}
 * These are used when constructing the internal Intl.NumberFormat
 * and Intl.DateTimeFormat instances.
 * @param {object} newFormats
 * @param {object} [newFormats.number]
 * @param {object} [newFormats.date]
 * @param {object} [newFormats.time]
 */
export function setFormats(newFormats) {
  if (!isObject(newFormats) || !hasValues(newFormats)) {
    throw new Error('[I18n] A `formats` must be non-empty object.');
  } else {
    formats = deepMerge(formats, newFormats);
  }
}

/**
 * Returns current formats
 * @returns {object} formats
 */
export function getFormats() {
  return formats;
}

/**
 * Returns array of locales having translations
 * @returns {string[]} locales
 */
export function getRegisteredLocales() {
  return Object.keys(messages);
}

/**
 * Translate message by id
 * @param {string} id - translation id to be translated
 * @param {object} [options]
 * @param {object} [options.values] - values to pass into translation
 * @param {string} [options.defaultMessage] - will be used unless translation was successful
 * @returns {string}
 */
export function translate(id, { values = {}, defaultMessage = '' } = {}) {
  if (!id) {
    throw new Error('[I18n] An `id` must be provided to translate a message.');
  }

  const message = getMessageById(getMessages(), id);

  if (!hasValues(values) && process.env.NODE_ENV === 'production') {
    return message || defaultMessage || id;
  }

  if (message) {
    try {
      const msg = getMessageFormat(message, getLocale(), getFormats());

      return msg.format(values);
    } catch (e) {
      throw new Error(
        `[I18n] Error formatting message: "${id}" for locale: "${getLocale()}".\n${e}`
      );
    }
  } else if (defaultMessage) {
    try {
      const msg = getMessageFormat(
        defaultMessage,
        getDefaultLocale(),
        getFormats()
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

/**
 * Initializes the engine
 * @param {Messages} newMessages
 */
export function init(newMessages) {
  if (newMessages) {
    addMessages(newMessages);

    if (newMessages.locale) {
      setLocale(newMessages.locale);
    }

    if (newMessages.formats) {
      setFormats(newMessages.formats);
    }
  }
}
