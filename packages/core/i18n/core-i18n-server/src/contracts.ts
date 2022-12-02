/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ScopedTranslator } from '@kbn/core-i18n-common';

/**
 * @public
 */
export interface I18nServiceSetup {
  /**
   * Return the locale currently in use.
   * @deprecated use `getDefaultLocale` instead
   */
  getLocale(): string;

  /**
   * Returns the default/system locale that can be used for unscoped system operations
   */
  getDefaultLocale(): string;

  /**
   * Return the absolute paths to translation files currently in use.
   */
  getTranslationFiles(): string[];

  /**
   * Returns a translator scoped to the provided locale.
   */
  getScopedTranslator(locale: string): ScopedTranslator;
}

/**
 * @public
 */
export interface I18nServiceStart {
  /**
   * Returns the locale associated with the provided request.
   *
   * @remarks This is a future-proof API and currently always return the locale specified in the config.
   */
  getLocaleForRequest(request: KibanaRequest): string;

  /**
   * Returns a translator scoped to the provided locale.
   */
  getScopedTranslator(locale: string): ScopedTranslator;
}
