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

import { i18n, i18nLoader } from '@kbn/i18n';
import { basename } from 'path';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { fromRoot } from '../../../core/server/utils';
import { getTranslationPaths } from './get_translations_path';
import { I18N_RC } from './constants';

export async function i18nMixin(kbnServer, server, config) {
  const locale = config.get('i18n.locale');

  const translationPaths = await Promise.all([
    getTranslationPaths({
      cwd: fromRoot('.'),
      glob: I18N_RC,
    }),
    ...config.get('plugins.paths').map(cwd => getTranslationPaths({ cwd, glob: I18N_RC })),
    ...config
      .get('plugins.scanDirs')
      .map(cwd => getTranslationPaths({ cwd, glob: `*/${I18N_RC}` })),
    getTranslationPaths({
      cwd: fromRoot('../kibana-extra'),
      glob: `*/${I18N_RC}`,
    }),
  ]);

  const currentTranslationPaths = []
    .concat(...translationPaths)
    .filter(translationPath => basename(translationPath, '.json') === locale);
  i18nLoader.registerTranslationFiles(currentTranslationPaths);

  const translations = await i18nLoader.getTranslationsByLocale(locale);
  i18n.init(
    Object.freeze({
      locale,
      ...translations,
    })
  );

  server.decorate('server', 'getTranslationsFilePaths', () => currentTranslationPaths);
}
