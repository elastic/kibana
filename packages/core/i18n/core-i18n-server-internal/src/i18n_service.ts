/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { IConfigService } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { InternalI18nServiceSetup, InternalI18nServiceStart } from './types';
import { config as i18nConfigDef, I18nConfigType } from './i18n_config';
import { getKibanaTranslationFiles } from './get_kibana_translation_files';
import { initTranslations } from './init_translations';
import { registerRoutes } from './routes';
import { ScopedTranslatorImpl } from './scoped_translator';

export interface PrebootDeps {
  http: InternalHttpServicePreboot;
  pluginPaths: string[];
}

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  pluginPaths: string[];
}

export class I18nService {
  private readonly log: Logger;
  private readonly configService: IConfigService;
  private defaultLocale?: string;

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('i18n');
    this.configService = coreContext.configService;
  }

  public async preboot({ pluginPaths, http }: PrebootDeps) {
    const { locale } = await this.initTranslations(pluginPaths);
    this.defaultLocale = locale;
    http.registerRoutes('', (router) => registerRoutes({ router }));
  }

  public async setup({ pluginPaths, http }: SetupDeps): Promise<InternalI18nServiceSetup> {
    const { locale, translationFiles } = await this.initTranslations(pluginPaths);
    this.defaultLocale = locale;
    const router = http.createRouter('');
    registerRoutes({ router });

    return {
      getLocale: () => locale,
      getDefaultLocale: () => locale,
      getTranslationFiles: () => translationFiles,
      getScopedTranslator: (l: string) => new ScopedTranslatorImpl(l),
    };
  }

  public async start(): Promise<InternalI18nServiceStart> {
    if (!this.defaultLocale) {
      throw new Error('#setup must be called before #start');
    }
    return {
      getLocaleForRequest: (request) => this.defaultLocale!,
      getScopedTranslator: (l: string) => new ScopedTranslatorImpl(l),
    };
  }

  private async initTranslations(pluginPaths: string[]) {
    const i18nConfig = await firstValueFrom(
      this.configService.atPath<I18nConfigType>(i18nConfigDef.path)
    );

    const defaultLocale = i18nConfig.locale;
    this.log.debug(`Using default locale: ${defaultLocale}`);

    const translationFiles = await getKibanaTranslationFiles({ pluginPaths });

    this.log.debug(`Using translation files: [${translationFiles.join(', ')}]`);
    await initTranslations(defaultLocale, translationFiles);

    return { locale: defaultLocale, translationFiles };
  }
}
