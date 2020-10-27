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

import { basename } from 'path';
import { take } from 'rxjs/operators';
import { i18n, i18nLoader } from '@kbn/i18n';
import { fromRoot } from '../utils';
import { Logger } from '../logging';
import { IConfigService } from '../config';
import { CoreContext } from '../core_context';
import type { PluginsConfig } from '../plugins';
import { config as i18nConfigDef, I18nConfigType } from './i18n_config';
import { getTranslationPaths } from './get_translations_path';

interface SetupDeps {
  pluginConfig: PluginsConfig;
}

export interface I18nServiceSetup {
  getLocale(): string;
  getTranslationFiles(): string[];
}

export class I18nService {
  private readonly log: Logger;
  private readonly configService: IConfigService;

  constructor(core: CoreContext) {
    this.log = core.logger.get('i18n');
    this.configService = core.configService;
  }

  public async setup({ pluginConfig }: SetupDeps): Promise<I18nServiceSetup> {
    const i18nConfig = await this.configService
      .atPath<I18nConfigType>(i18nConfigDef.path)
      .pipe(take(1))
      .toPromise();

    const locale = i18nConfig.locale;
    this.log.debug(`Using locale: ${locale}`);

    const translationFiles = await getTranslationFiles(locale, pluginConfig);

    this.log.debug(`Registering translation files: [${translationFiles.join(', ')}]`);
    i18nLoader.registerTranslationFiles(translationFiles);

    const translations = await i18nLoader.getTranslationsByLocale(locale);
    i18n.init(
      Object.freeze({
        locale,
        ...translations,
      })
    );

    return {
      getLocale: () => locale,
      getTranslationFiles: () => translationFiles,
    };
  }
}

const getTranslationFiles = async (
  locale: string,
  pluginConfig: PluginsConfig
): Promise<string[]> => {
  const translationPaths = await Promise.all([
    getTranslationPaths({
      cwd: fromRoot('.'),
      nested: true,
    }),
    ...pluginConfig.additionalPluginPaths.map((cwd) => getTranslationPaths({ cwd, nested: false })),
    ...pluginConfig.pluginSearchPaths.map((cwd) => getTranslationPaths({ cwd, nested: true })),
    getTranslationPaths({
      cwd: fromRoot('../kibana-extra'),
      nested: true,
    }),
  ]);

  return ([] as string[])
    .concat(...translationPaths)
    .filter((translationPath) => basename(translationPath, '.json') === locale);
};
