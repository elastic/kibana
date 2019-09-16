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

interface TranslationsMock {
  [title: string]: string;
}

const createI18nLoaderMock = (translations: TranslationsMock) => {
  return {
    getTranslationsByLocale() {
      return {
        messages: translations,
      };
    },
  };
};

import { getTranslationCount } from './telemetry_localization_collector';

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
