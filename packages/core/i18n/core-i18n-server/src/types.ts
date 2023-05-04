/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @public
 */
export interface I18nServiceSetup {
  /**
   * Return the locale currently in use.
   */
  getLocale(): string;

  /**
   * Return the absolute paths to translation files currently in use.
   */
  getTranslationFiles(): string[];
}
