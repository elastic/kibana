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

import glob from 'glob';
import { promisify } from 'util';
import { i18n, i18nLoader } from '@kbn/i18n';

const globAsync = promisify(glob);

export async function i18nMixin(kbnServer, server, config) {
  const locale = config.get('i18n.locale');

  const groupedEntries = await Promise.all(
    config.get('i18n.translationsScanDirs').map(path =>
      globAsync('**/translations/*.json', {
        cwd: path,
        ignore: ['**/node_modules/**', '**/__tests__/**'],
      })
    )
  );

  const translationPaths = [].concat(...groupedEntries);

  i18nLoader.registerTranslationFiles(translationPaths);

  const pureTranslations = await i18nLoader.getTranslationsByLocale(locale);
  const translations = Object.freeze({
    locale,
    ...pureTranslations,
  });

  i18n.init(translations);

  server.decorate('server', 'getUiTranslations', () => translations);
}
