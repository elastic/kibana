/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';
import type { IConfigService } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import { Translation, i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { firstValueFrom } from 'rxjs';
import { getKibanaTranslationFiles } from './get_kibana_translation_files';
import { I18nConfigType, config as i18nConfigDef } from './i18n_config';
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
}

export class I18nService {
  private readonly log: Logger;
  private readonly configService: IConfigService;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('i18n');
    this.configService = coreContext.configService;
  }

  public async preboot({ pluginPaths, http }: PrebootDeps): Promise<InternalI18nServicePreboot> {
    const { locale, translationHash } = await this.initTranslations(pluginPaths);
    const { dist: isDist } = this.coreContext.env.packageInfo;
    http.registerRoutes('', (router) =>
      registerRoutes({ router, locale, isDist, translationHash })
    );

    return {
      getTranslationHash: () => translationHash,
    };
  }

  public async setup({ pluginPaths, http }: SetupDeps): Promise<I18nServiceSetup> {
    const { locale, translationFiles, translationHash } = await this.initTranslations(pluginPaths);

    const router = http.createRouter('');
    const { dist: isDist } = this.coreContext.env.packageInfo;
    registerRoutes({ router, locale, isDist, translationHash });

    return {
      getLocale: () => locale,
      getTranslationFiles: () => translationFiles,
      getTranslationHash: () => translationHash,
    };
  }

  private async initTranslations(pluginPaths: string[]) {
    const i18nConfig = await firstValueFrom(
      this.configService.atPath<I18nConfigType>(i18nConfigDef.path)
    );

    const locale = i18nConfig.locale;
    this.log.debug(`Using locale: ${locale}`);

    const translationFiles = await getKibanaTranslationFiles(locale, pluginPaths);

    this.log.debug(`Using translation files: [${translationFiles.join(', ')}]`);
    await initTranslations(locale, translationFiles);

    const translationHash = getTranslationHash(i18n.getTranslation());

    return { locale, translationFiles, translationHash };
  }
}

const getTranslationHash = (translations: Translation) => {
  const serialized = JSON.stringify(translations);
  return createHash('sha256').update(serialized).digest('hex').slice(0, 12);
};
