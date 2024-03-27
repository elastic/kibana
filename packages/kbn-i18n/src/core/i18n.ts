/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createIntl, createIntlCache } from '@formatjs/intl';
import type { MessageDescriptor } from '@formatjs/intl';

import type {
  PrimitiveType,
  FormatXMLElementFn,
  Options as IntlMessageFormatOptions,
} from 'intl-messageformat';

import { Translation } from '../translation';

// Add all locale data to `IntlMessageFormat`.
import './locales';

const EN_LOCALE = 'en';
const defaultLocale = EN_LOCALE;
const currentLocale = EN_LOCALE;

const translationsForLocale: Record<string, Translation> = {};

const cache = createIntlCache();
let intl = createIntl(
  {
    locale: defaultLocale,
    messages: {},
  },
  cache
);

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
export function addTranslation(newTranslation: Translation) {
  if (!newTranslation.locale || typeof newTranslation.locale !== 'string') {
    throw new Error('[I18n] A `locale` must be a non-empty string to add messages.');
  }
  const { locale } = newTranslation;

  intl = createIntl(
    {
      locale,
      messages: newTranslation.messages,
      formats: newTranslation.formats,
    },
    cache
  );
}

/**
 * Returns messages for the current language
 */
export function getTranslation(): Translation {
  return {
    messages: intl.messages,
  };
}

/**
 * Returns the current locale
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Returns current formats
 */
export function getFormats() {
  return intl.formats;
}

/**
 * Returns array of locales having translations
 */
export function getRegisteredLocales() {
  return Object.keys(translationsForLocale);
}

export interface TranslateArguments {
  defaultMessage: MessageDescriptor['defaultMessage'];
  description?: MessageDescriptor['description'];
  values?: Record<string, PrimitiveType | FormatXMLElementFn<string, string>>;
  options?: IntlMessageFormatOptions;
}

/**
 * Translate message by id
 * @param id - translation id to be translated
 * @param [options]
 * @param [options.values] - values to pass into translation
 * @param [options.defaultMessage] - will be used unless translation was successful
 */
export function translate(id: string, { values = {}, defaultMessage }: TranslateArguments): string {
  // const shouldUsePseudoLocale = isPseudoLocale(currentLocale);

  if (!id || typeof id !== 'string') {
    throw new Error('[I18n] An `id` must be a non-empty string to translate a message.');
  }

  return intl.formatMessage(
    {
      id,
      defaultMessage,
    },
    values
  );

  // const message = shouldUsePseudoLocale ? defaultMessage : getMessageById(id);

  // if (!message && !defaultMessage) {
  //   throw new Error(`[I18n] Cannot format message: "${id}". Default message must be provided.`);
  // }

  // if (message) {
  //   try {
  //     // We should call `format` even for messages without any value references
  //     // to let it handle escaped curly braces `\\{` that are the part of the text itself
  //     // and not value reference boundaries.
  //     const formattedMessage = getMessageFormat(message, getLocale(), getFormats()).format(values);

  //     return shouldUsePseudoLocale
  //       ? translateUsingPseudoLocale(formattedMessage)
  //       : formattedMessage;
  //   } catch (e) {
  //     throw new Error(
  //       `[I18n] Error formatting message: "${id}" for locale: "${getLocale()}".\n${e}`
  //     );
  //   }
  // }

  // try {
  //   const msg = getMessageFormat(defaultMessage, currentLocale, getFormats());

  //   return msg.format(values);
  // } catch (e) {
  //   throw new Error(`[I18n] Error formatting the default message for: "${id}".\n${e}`);
  // }
}

/**
 * REMOVE
 * Initializes the engine
 * @param newTranslation
 */
export function init(newTranslation?: Translation) {
  if (!newTranslation) {
    return;
  }

  addTranslation(newTranslation);
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

  const newTranslation = await response.json();

  if (!newTranslation || !Object.keys(newTranslation.messages).length) {
    return;
  }

  addTranslation(newTranslation);
}
