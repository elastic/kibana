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

import { resolve } from 'path';
import globby from 'globby';
import { i18n, i18nLoader } from '@kbn/i18n';

import { fromRoot } from '../../utils';

export async function i18nMixin(kbnServer, server, config) {
  const locale = config.get('i18n.locale');

  const translationsDirs = [fromRoot('src/ui/translations'), fromRoot('src/server/translations'), fromRoot('src/core/translations')];

  const groupedEntries = await Promise.all([
    ...config.get('plugins.scanDirs').map(async path => {
      const entries = await globby(`*/translations/${locale}.json`, {
        cwd: path,
      });
      return entries.map(entry => resolve(path, entry));
    }),

    ...config.get('plugins.paths').map(async path => {
      const entries = await globby(
        [`translations/${locale}.json`, `plugins/*/translations/${locale}.json`],
        {
          cwd: path,
        }
      );
      return entries.map(entry => resolve(path, entry));
    }),

    ...translationsDirs.map(async path => {
      const entries = await globby(`${locale}.json`, {
        cwd: path,
      });
      return entries.map(entry => resolve(path, entry));
    }),
  ]);

  const translationPaths = [].concat(...groupedEntries);
  i18nLoader.registerTranslationFiles(translationPaths);

  const translations = await i18nLoader.getTranslationsByLocale(locale);
  i18n.init(Object.freeze({
    locale,
    ...translations,
  }));
}
