/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IntlShape, CustomFormats } from '@formatjs/intl';

export interface TranslationInput {
  /**
   * Actual translated messages.
   */
  messages: IntlShape['messages'];
  /**
   * Locale of the translated messages.
   */
  locale: IntlShape['locale'];
  /**
   * Set of options to the underlying formatter.
   */
  formats?: CustomFormats;
}

export interface Translation extends TranslationInput {
  /**
   * Default locale to fall back to when the translation is not found for the message id.
   * Hardcoded to `en` for Kibana.
   */
  defaultLocale: IntlShape['defaultLocale'];
  /**
   * default formatter formats.
   */
  defaultFormats: IntlShape['formats'];
}
