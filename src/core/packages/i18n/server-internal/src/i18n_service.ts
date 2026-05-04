/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { i18nLoader, getLocaleLabel, type AvailableLocale } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import type { IConfigService } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import type { I18nConfigType } from './i18n_config';
import { config as i18nConfigDef } from './i18n_config';
import { getAllKibanaTranslationFiles } from './get_kibana_translation_files';
import { initTranslations } from './init_translations';
import { registerRoutes } from './routes';

export interface PrebootDeps {
  http: InternalHttpServicePreboot;
  pluginPaths: string[];
}

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  pluginPaths: string[];
}

export interface InternalI18nServicePreboot {
  getTranslationHash(): string;
  getTranslationHashes(): Record<string, string>;
  getAvailableLocales(): ReadonlyArray<AvailableLocale>;
}

export class I18nService {
  private readonly log: Logger;
  private readonly configService: IConfigService;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('i18n');
    this.configService = coreContext.configService;
  }

  public async preboot({ pluginPaths, http }: PrebootDeps): Promise<InternalI18nServicePreboot> {
    const { defaultLocale, availableLocales, translationHash, translationHashes } =
      await this.initTranslations(pluginPaths);
    const { dist: isDist } = this.coreContext.env.packageInfo;
    http.registerRoutes('', (router) =>
      registerRoutes({
        router,
        locale: defaultLocale,
        isDist,
        translationHashes,
      })
    );

    return {
      getTranslationHash: () => translationHash,
      getTranslationHashes: () => translationHashes,
      getAvailableLocales: () => availableLocales,
    };
  }

  public async setup({ pluginPaths, http }: SetupDeps): Promise<I18nServiceSetup> {
    const {
      defaultLocale,
      locales,
      availableLocales,
      translationFiles,
      translationHash,
      translationHashes,
    } = await this.initTranslations(pluginPaths);

    const router = http.createRouter('');
    const { dist: isDist } = this.coreContext.env.packageInfo;
    registerRoutes({
      router,
      locale: defaultLocale,
      isDist,
      translationHashes,
    });

    return {
      getLocale: () => defaultLocale,
      getLocales: () => locales,
      getAvailableLocales: () => availableLocales,
      getTranslationFiles: () => translationFiles,
      getTranslationHash: () => translationHash,
      getTranslationHashes: () => translationHashes,
    };
  }

  private async initTranslations(pluginPaths: string[]) {
    const i18nConfig = await firstValueFrom(
      this.configService.atPath<I18nConfigType>(i18nConfigDef.path)
    );

    const { defaultLocale, locales } = i18nConfig;
    this.log.debug(`Using defaultLocale: ${defaultLocale}, locales: [${locales.join(', ')}]`);

    // Register translation files for all configured locales upfront.
    const allTranslationFiles = await getAllKibanaTranslationFiles(pluginPaths, locales);

    this.log.debug(`Using translation files: [${allTranslationFiles.join(', ')}]`);
    await initTranslations(defaultLocale, allTranslationFiles);

    // Eagerly load and hash configured locales (always including defaultLocale,
    // even if i18n.locales is empty, so the translations route can serve it).
    // Hashes let the rendering service build cache-busted URLs and the
    // translation route validate requests.
    const translationHashes: Record<string, string> = {};
    const localesToHash = new Set<string>([defaultLocale, ...locales]);
    for (const supportedLocale of localesToHash) {
      const translationData = await i18nLoader.getTranslationsByLocale(supportedLocale);
      translationData.locale = supportedLocale;
      const serialized = JSON.stringify(translationData);
      translationHashes[supportedLocale] = computeHash(serialized);
    }

    const translationHash = translationHashes[defaultLocale];

    const availableLocales: AvailableLocale[] = locales.map((id) => ({
      id,
      label: getLocaleLabel(id),
    }));

    return {
      defaultLocale,
      locales,
      availableLocales,
      translationFiles: allTranslationFiles,
      translationHash,
      translationHashes,
    };
  }
}

const computeHash = (serialized: string) => {
  return createHash('sha256').update(serialized).digest('hex').slice(0, 12);
};
