/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

interface TranslationsMock {
  [title: string]: string;
}

const createI18nLoaderMock = (translations: TranslationsMock) => {
  return ({
    getTranslationsByLocale() {
      return {
        messages: translations,
      };
    },
  } as unknown) as typeof i18nLoader;
};

import { getTranslationCount } from './telemetry_localization_collector';
import { i18nLoader } from '@kbn/i18n';

describe('getTranslationCount', () => {
  it('returns 0 if no translations registered', async () => {
    const i18nLoaderMock = createI18nLoaderMock({});
    const count = await getTranslationCount(i18nLoaderMock, 'en');
    expect(count).toEqual(0);
  });

  it('returns number of translations', async () => {
    const i18nLoaderMock = createI18nLoaderMock({
      a: '1',
      b: '2',
      'b.a': '3',
    });
    const count = await getTranslationCount(i18nLoaderMock, 'en');
    expect(count).toEqual(3);
  });
});
