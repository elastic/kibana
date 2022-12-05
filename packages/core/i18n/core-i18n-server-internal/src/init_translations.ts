/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n, i18nLoader } from '@kbn/i18n';

export const initTranslations = async (defaultLocale: string, translationFiles: string[]) => {
  i18nLoader.registerTranslationFiles(translationFiles);

  const loadedTranslations = await i18nLoader.getAllTranslationsFromPaths([]);
  i18n.addTranslations(loadedTranslations);

  i18n.setDefaultLocale(defaultLocale);
  const translations = await i18nLoader.getTranslationsByLocale(defaultLocale);
  i18n.init(
    Object.freeze({
      defaultLocale,
      ...translations,
    })
  );
};
