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

import memoizeIntlConstructor from 'intl-format-cache';
import IntlMessageFormat from 'intl-messageformat';
import IntlRelativeFormat from 'intl-relativeformat';

import { Translation } from '../translation';
import { Formats, formats as EN_FORMATS } from './formats';
import { hasValues, isObject, isString, mergeAll } from './helper';
import { isPseudoLocale, translateUsingPseudoLocale } from './pseudo_locale';

// Add all locale data to `IntlMessageFormat`.
import './locales.js';

const EN_LOCALE = 'en';
const translationsForLocale: Record<string, Translation> = {};
const getMessageFormat = memoizeIntlConstructor(IntlMessageFormat);

let defaultLocale = EN_LOCALE;
let currentLocale = EN_LOCALE;
let formats = EN_FORMATS;

IntlMessageFormat.defaultLocale = defaultLocale;
IntlRelativeFormat.defaultLocale = defaultLocale;

/**
 * Returns message by the given message id.
 * @param id - path to the message
 */
function getMessageById(id: string): string | undefined {
  const translation = getTranslation();
  return translation.messages ? translation.messages[id] : undefined;
}

/**
 * Normalizes locale to make it consistent with IntlMessageFormat locales
 * @param locale
 */
function normalizeLocale(locale: string) {
  return locale.toLowerCase();
}

/**
 * Provides a way to register translations with the engine
 * @param newTranslation
 * @param [locale = messages.locale]
 */
export function addTranslation(newTranslation: Translation, locale = newTranslation.locale) {
  if (!locale || !isString(locale)) {
    throw new Error('[I18n] A `locale` must be a non-empty string to add messages.');
  }

  if (newTranslation.locale && newTranslation.locale !== locale) {
    throw new Error(
      '[I18n] A `locale` in the translation object is different from the one provided as a second argument.'
    );
  }

  const normalizedLocale = normalizeLocale(locale);
  const existingTranslation = translationsForLocale[normalizedLocale] || { messages: {} };

  translationsForLocale[normalizedLocale] = {
    formats: newTranslation.formats || existingTranslation.formats,
    locale: newTranslation.locale || existingTranslation.locale,
    messages: {
      ...existingTranslation.messages,
      ...newTranslation.messages,
    },
  };
}

/**
 * Returns messages for the current language
 */
export function getTranslation(): Translation {
  return translationsForLocale[currentLocale] || { messages: {} };
}

/**
 * Tells the engine which language to use by given language key
 * @param locale
 */
export function setLocale(locale: string) {
  if (!locale || !isString(locale)) {
    throw new Error('[I18n] A `locale` must be a non-empty string.');
  }

  currentLocale = normalizeLocale(locale);
}

/**
 * Returns the current locale
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Tells the library which language to fallback when missing translations
 * @param locale
 */
export function setDefaultLocale(locale: string) {
  if (!locale || !isString(locale)) {
    throw new Error('[I18n] A `locale` must be a non-empty string.');
  }

  defaultLocale = normalizeLocale(locale);
  IntlMessageFormat.defaultLocale = defaultLocale;
  IntlRelativeFormat.defaultLocale = defaultLocale;
}

export function getDefaultLocale() {
  return defaultLocale;
}

/**
 * Supplies a set of options to the underlying formatter
 * [Default format options used as the prototype of the formats]
 * {@link https://github.com/yahoo/intl-messageformat/blob/master/src/core.js#L62}
 * These are used when constructing the internal Intl.NumberFormat
 * and Intl.DateTimeFormat instances.
 * @param newFormats
 * @param [newFormats.number]
 * @param [newFormats.date]
 * @param [newFormats.time]
 */
export function setFormats(newFormats: Formats) {
  if (!isObject(newFormats) || !hasValues(newFormats)) {
    throw new Error('[I18n] A `formats` must be a non-empty object.');
  }

  formats = mergeAll(formats, newFormats);
}

/**
 * Returns current formats
 */
export function getFormats() {
  return formats;
}

/**
 * Returns array of locales having translations
 */
export function getRegisteredLocales() {
  return Object.keys(translationsForLocale);
}

interface TranslateArguments {
  values?: Record<string, string | number | boolean | Date | null | undefined>;
  defaultMessage: string;
  description?: string;
}

/**
 * Translate message by id
 * @param id - translation id to be translated
 * @param [options]
 * @param [options.values] - values to pass into translation
 * @param [options.defaultMessage] - will be used unless translation was successful
 */
export function translate(id: string, { values = {}, defaultMessage }: TranslateArguments) {
  const shouldUsePseudoLocale = isPseudoLocale(currentLocale);

  if (!id || !isString(id)) {
    throw new Error('[I18n] An `id` must be a non-empty string to translate a message.');
  }

  const message = shouldUsePseudoLocale ? defaultMessage : getMessageById(id);

  if (!message && !defaultMessage) {
    throw new Error(`[I18n] Cannot format message: "${id}". Default message must be provided.`);
  }

  if (message) {
    try {
      // We should call `format` even for messages without any value references
      // to let it handle escaped curly braces `\\{` that are the part of the text itself
      // and not value reference boundaries.
      const formattedMessage = getMessageFormat(message, getLocale(), getFormats()).format(values);

      return shouldUsePseudoLocale
        ? translateUsingPseudoLocale(formattedMessage)
        : formattedMessage;
    } catch (e) {
      throw new Error(
        `[I18n] Error formatting message: "${id}" for locale: "${getLocale()}".\n${e}`
      );
    }
  }

  try {
    const msg = getMessageFormat(defaultMessage, getDefaultLocale(), getFormats());

    return msg.format(values);
  } catch (e) {
    throw new Error(`[I18n] Error formatting the default message for: "${id}".\n${e}`);
  }
}

/**
 * Initializes the engine
 * @param newTranslation
 */
export function init(newTranslation?: Translation) {
  if (!newTranslation) {
    return;
  }

  addTranslation(newTranslation);

  if (newTranslation.locale) {
    setLocale(newTranslation.locale);
  }

  if (newTranslation.formats) {
    setFormats(newTranslation.formats);
  }
}

/**
 * Loads JSON with translations from the specified URL and initializes i18n engine with them.
 * @param translationsUrl URL pointing to the JSON bundle with translations.
 */
export async function load(translationsUrl: string) {
  // Once this package is integrated into core Kibana we should switch to an abstraction
  // around `fetch` provided by the platform, e.g. `kfetch`.
  const response = await fetch(translationsUrl, {
    credentials: 'same-origin',
  });

  if (response.status >= 300) {
    throw new Error(`Translations request failed with status code: ${response.status}`);
  }

  init(await response.json());
}
