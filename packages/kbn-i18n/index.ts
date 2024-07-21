/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getTranslation,
  getLocale,
  translate,
  init,
  load,
  handleIntlError,
  getIsInitialized,
} from './src/core';

import {
  registerTranslationFile,
  registerTranslationFiles,
  getTranslationsByLocale,
  getAllTranslations,
  getAllTranslationsFromPaths,
  getRegisteredLocales as getRegisteredLocalesForLoader,
} from './src/loader';

const i18n = {
  getTranslation,
  getLocale,
  translate,
  init,
  load,
  handleIntlError,
  getIsInitialized,
};

const i18nLoader = {
  registerTranslationFile,
  registerTranslationFiles,
  getTranslationsByLocale,
  getAllTranslations,
  getAllTranslationsFromPaths,
  getRegisteredLocales: getRegisteredLocalesForLoader,
};

export type { Translation, TranslationInput } from './src/translation';
export type { Formats, TranslateArguments } from './src/core';
export { i18n, i18nLoader };
