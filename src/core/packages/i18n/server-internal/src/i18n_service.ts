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
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import type { IConfigService } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import { SUPPORTED_LOCALE_IDS, i18nLoader } from '@kbn/i18n';
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
}

export class I18nService {
  private readonly log: Logger;
  private readonly configService: IConfigService;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('i18n');
    this.configService = coreContext.configService;
  }

  public async preboot({ pluginPaths, http }: PrebootDeps): Promise<InternalI18nServicePreboot> {
    const { locale, translationHash, translationHashes } = await this.initTranslations(pluginPaths);
    const { dist: isDist } = this.coreContext.env.packageInfo;
    http.registerRoutes('', (router) =>
      registerRoutes({
        router,
        locale,
        isDist,
        translationHashes,
      })
    );

    return {
      getTranslationHash: () => translationHash,
      getTranslationHashes: () => translationHashes,
    };
  }

  public async setup({ pluginPaths, http }: SetupDeps): Promise<I18nServiceSetup> {
    const { locale, translationFiles, translationHash, translationHashes } =
      await this.initTranslations(pluginPaths);

    const router = http.createRouter('');
    const { dist: isDist } = this.coreContext.env.packageInfo;
    registerRoutes({
      router,
      locale,
      isDist,
      translationHashes,
    });

    return {
      getLocale: () => locale,
      getTranslationFiles: () => translationFiles,
      getTranslationHash: () => translationHash,
      getTranslationHashes: () => translationHashes,
    };
  }

  private async initTranslations(pluginPaths: string[]) {
    const i18nConfig = await firstValueFrom(
      this.configService.atPath<I18nConfigType>(i18nConfigDef.path)
    );

    const locale = i18nConfig.locale;
    this.log.debug(`Using locale: ${locale}`);

    // Register translation files for all supported locales upfront.
    const allTranslationFiles = await getAllKibanaTranslationFiles(pluginPaths);

    this.log.debug(`Using translation files: [${allTranslationFiles.join(', ')}]`);
    await initTranslations(locale, allTranslationFiles);

    // Eagerly load and hash all supported locales so that per-locale cache-busting
    // URLs can be injected into the page metadata at render time.
    // TODO: [Phase 2 — server-side locale switching] The translation data for every
    // supported locale is now loaded into memory (cached by i18nLoader). A future
    // change can use i18nLoader.getTranslationsByLocale(userLocale) here to
    // re-initialize i18n with the user's preferred locale for server-rendered strings
    // (e.g. error messages, CSV exports). This is the right place to wire that in
    // because all translation files are already registered and loaded.
    const translationHashes: Record<string, string> = {};
    for (const supportedLocale of SUPPORTED_LOCALE_IDS) {
      const translationData = await i18nLoader.getTranslationsByLocale(supportedLocale);
      translationData.locale = supportedLocale;
      const serialized = JSON.stringify(translationData);
      translationHashes[supportedLocale] = computeHash(serialized);
    }

    const translationHash =
      translationHashes[locale] ?? computeHash(JSON.stringify(i18n.getTranslation()));

    return { locale, translationFiles: allTranslationFiles, translationHash, translationHashes };
  }
}

const computeHash = (serialized: string) => {
  return createHash('sha256').update(serialized).digest('hex').slice(0, 12);
};
