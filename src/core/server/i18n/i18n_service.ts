/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { Logger } from '../logging';
import { IConfigService } from '../config';
import { CoreContext } from '../core_context';
import { InternalHttpServiceSetup } from '../http';
import { config as i18nConfigDef, I18nConfigType } from './i18n_config';
import { getKibanaTranslationFiles } from './get_kibana_translation_files';
import { initTranslations } from './init_translations';
import { registerRoutes } from './routes';

interface SetupDeps {
  http: InternalHttpServiceSetup;
  pluginPaths: string[];
}

/**
 * @public
 */
export interface I18nServiceSetup {
  /**
   * Return the locale currently in use.
   */
  getLocale(): string;

  /**
   * Return the absolute paths to translation files currently in use.
   */
  getTranslationFiles(): string[];
}

export class I18nService {
  private readonly log: Logger;
  private readonly configService: IConfigService;

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('i18n');
    this.configService = coreContext.configService;
  }

  public async setup({ pluginPaths, http }: SetupDeps): Promise<I18nServiceSetup> {
    const i18nConfig = await this.configService
      .atPath<I18nConfigType>(i18nConfigDef.path)
      .pipe(take(1))
      .toPromise();

    const locale = i18nConfig.locale;
    this.log.debug(`Using locale: ${locale}`);

    const translationFiles = await getKibanaTranslationFiles(locale, pluginPaths);

    this.log.debug(`Using translation files: [${translationFiles.join(', ')}]`);
    await initTranslations(locale, translationFiles);

    const router = http.createRouter('');
    registerRoutes({ router, locale });

    return {
      getLocale: () => locale,
      getTranslationFiles: () => translationFiles,
    };
  }
}
