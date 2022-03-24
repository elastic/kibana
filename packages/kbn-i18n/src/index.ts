/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  formats,
  addTranslation,
  getTranslation,
  setLocale,
  getLocale,
  setDefaultLocale,
  getDefaultLocale,
  setFormats,
  getFormats,
  getRegisteredLocales,
  translate,
  init,
  load,
  isPseudoLocale,
  translateUsingPseudoLocale,
} from './core';

import {
  registerTranslationFile,
  registerTranslationFiles,
  getTranslationsByLocale,
  getAllTranslations,
  getAllTranslationsFromPaths,
  getRegisteredLocales as getRegisteredLocalesForLoader,
} from './loader';

const i18n = {
  formats,
  addTranslation,
  getTranslation,
  setLocale,
  getLocale,
  setDefaultLocale,
  getDefaultLocale,
  setFormats,
  getFormats,
  getRegisteredLocales,
  translate,
  init,
  load,
  isPseudoLocale,
  translateUsingPseudoLocale,
};

const i18nLoader = {
  registerTranslationFile,
  registerTranslationFiles,
  getTranslationsByLocale,
  getAllTranslations,
  getAllTranslationsFromPaths,
  getRegisteredLocales: getRegisteredLocalesForLoader,
};

export type { Translation } from './translation';
export type { Formats, TranslateArguments } from './core';
export { i18n, i18nLoader };
