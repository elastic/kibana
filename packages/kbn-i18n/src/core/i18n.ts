/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createIntl, createIntlCache, IntlConfig, IntlShape } from '@formatjs/intl';
import type { MessageDescriptor } from '@formatjs/intl';
import type { PrimitiveType, FormatXMLElementFn } from 'intl-messageformat';
import { handleIntlError } from './error_handler';

import { Translation, TranslationInput } from '../translation';
import { polyfillLocale } from './polyfills';
import { defaultEnFormats } from './formats';

const EN_LOCALE = 'en';
const defaultLocale = EN_LOCALE;
const cache = createIntlCache();

/**
 * Currently we are depending on this singleton pattern to
 * update the locale. This is mainly to make it easier on developers
 * to use i18n by importing it anywhere in their code and using it directly
 * without having to pass it around.
 * This pattern has several limitations and can cause unexpected bugs. The main limitation
 * is that we cannot server multiple locales on the server side based on the user requested
 * locale.
 */
let intl: IntlShape<string>;

/**
 * ideally here we would be using a `throw new Error()` if i18n.translate is called before init();
 * to make sure i18n is initialized before any message is attempting to be translated.
 *
 * Especially since these messages will go unnoticed since the translations might be provided in the translation files
 * but Kibana will use the default message since the locales are not loaded yet.
 *
 * we need to get there at some point but this means removing all static i18n imports from the server side.
 */
intl = createIntl({ locale: defaultLocale, defaultFormats: defaultEnFormats, defaultLocale });

/**
 * Normalizes locale to make it consistent with IntlMessageFormat locales
 * @param locale
 */
function normalizeLocale(locale: string) {
  return locale.toLowerCase();
}

/**
 * Provides a way to register translations with the engine
 */
export function activateTranslation(newTranslation: TranslationInput) {
  if (!newTranslation.locale || typeof newTranslation.locale !== 'string') {
    throw new Error('[I18n] A `locale` must be a non-empty string to add messages.');
  }
  const config: IntlConfig<string> = {
    locale: normalizeLocale(newTranslation.locale),
    messages: newTranslation.messages,
    // defaultFormats: defaultEnFormats,
    defaultLocale,
    onError: handleIntlError,
  };

  // formatJS differentiates between `formats: undefined` and unset `formats`.
  if (newTranslation.formats) {
    config.formats = newTranslation.formats;
  }

  intl = createIntl(config, cache);
}

/**
 * Returns messages for the current language
 */
export function getTranslation(): Translation {
  return {
    messages: intl.messages,
    locale: intl.locale,
    defaultLocale: intl.defaultLocale,
    defaultFormats: intl.defaultFormats,
    formats: intl.formats,
  };
}

/**
 * Returns the current locale
 * Shortcut to getTranslation().locale
 */
export function getLocale() {
  return intl.locale;
}

export interface TranslateArguments {
  /**
   * Will be used unless translation was successful
   */
  defaultMessage: MessageDescriptor['defaultMessage'];
  /**
   * Message description, used by translators and other devs to understand the message context.
   */
  description?: MessageDescriptor['description'];
  /**
   * values to pass into translation
   */
  values?: Record<string, PrimitiveType | FormatXMLElementFn<string, string>>;
  /**
   * Whether to treat HTML/XML tags as string literal
   * instead of parsing them as tag token.
   * When this is false we only allow simple tags without
   * any attributes
   */
  ignoreTag?: boolean;
}

/**
 * Translate message by id
 * @param id - translation id to be translated
 * @param [options]
 * @param [options.values] - values to pass into translation
 * @param [options.defaultMessage] - will be used unless translation was successful
 * @param [options.description] - message description, used by translators and other devs to understand the message context.
 * @param [options.ignoreTag] - Whether to treat HTML/XML tags as string literal instead of parsing them as tag token. When this is false we only allow simple tags without any attributes
 */
export function translate(
  id: string,
  { values = {}, description, defaultMessage, ignoreTag }: TranslateArguments
): string {
  if (!id || typeof id !== 'string') {
    throw new Error('[I18n] An `id` must be a non-empty string to translate a message.');
  }

  try {
    if (!defaultMessage) {
      throw new Error('Missing `defaultMessage`.');
    }

    /* eslint-disable formatjs/enforce-default-message */
    return intl.formatMessage(
      {
        id,
        defaultMessage,
        description,
      },
      values,
      { ignoreTag }
    );
    /* eslint-enable */
  } catch (e) {
    throw new Error(`[I18n] Error formatting the default message for: "${id}".\n${e}`);
  }
}

/**
 * Initializes the engine
 * @param newTranslation
 */
export function init(newTranslation?: TranslationInput) {
  if (!newTranslation) {
    return;
  }

  activateTranslation(newTranslation);
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

  if (!newTranslation.locale || typeof newTranslation.locale !== 'string') {
    return;
  }

  await polyfillLocale(normalizeLocale(newTranslation.locale));
  activateTranslation(newTranslation);
}
