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
import { fromRoot } from '../../utils';
import { getTranslationPaths } from './get_translations_path';
import { I18N_RC } from './constants';

export function getLocalesToRegister(config) {
  const configLocales = config.get('i18n.locales');
  console.log('configLocales:', configLocales)
  if (configLocales.length) {
    return configLocales;
  }

  const configLocale = config.get('i18n.locale');
  if (configLocale) {
    return [configLocale];
  }

  const configDefaultLocale = config.get('i18n.defaultLocale');

  if (configDefaultLocale) {
    return [configDefaultLocale];
  }
  return ["en"];
}

function getDefaultLocale(config) {
  const locales = config.get('i18n.locales');
  const defaultLocale = config.get('i18n.defaultLocale') || config.get('i18n.locale');

  if (defaultLocale || deprecatedLocale) {
    if (locales.length && !locales.includes(defaultLocale)) {
      throw Error(`Default Locale "${defaultLocale}" must be included in the i18n.locales config.`)
    }
    return defaultLocale || deprecatedLocale;
  }

  if (locales.length) {
    return locales[0];
  }

  return "en"
}

export async function i18nMixin(kbnServer, server, config) {
  const locales = getLocalesToRegister(config);
  const defaultLocale = getDefaultLocale(config);

  const translationPaths = await Promise.all([
    getTranslationPaths({
      cwd: fromRoot('.'),
      glob: I18N_RC,
    }),
    ...config.get('plugins.paths').map(cwd => getTranslationPaths({ cwd, glob: I18N_RC })),
    ...config.get('plugins.scanDirs').map(cwd => getTranslationPaths({ cwd, glob: `*/${I18N_RC}` })),
    getTranslationPaths({
      cwd: fromRoot('../kibana-extra'),
      glob: `*/${I18N_RC}`,
    }),
  ]);

  const currentTranslationPaths = [].concat(...translationPaths)
    .filter(translationPath => locales.includes(basename(translationPath, '.json')));

  console.log('currentTranslationPaths::', currentTranslationPaths)
  i18nLoader.registerTranslationFiles(currentTranslationPaths);
  const loadedTranslations = await i18nLoader.getAllTranslationsFromPaths();
  i18n.addTranslations(loadedTranslations);

  console.log('reg::', i18n.getRegisteredLocales());
  i18n.setDefaultLocale(defaultLocale);
  server.decorate('server', 'getTranslationsFilePaths', () => currentTranslationPaths);

  // legacy should be removed once server side i18n issue is figured out.
  // i18n will be initialized per request and never globally.

  const translations = await i18nLoader.getTranslationsByLocale(defaultLocale);
  i18n.init(Object.freeze({
    locale: defaultLocale,
    ...translations,
  }));
}
