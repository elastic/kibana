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
import { i18n, getLocaleLabel, createScopedTranslator, type AvailableLocale } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import type { IConfigService } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type {
  I18nServiceSetup,
  RequestI18nClient,
  ServerTranslateArgs,
} from '@kbn/core-i18n-server';
import { i18nLoader } from '@kbn/i18n';
import type { I18nConfigType } from './i18n_config';
import { config as i18nConfigDef } from './i18n_config';
import {
  getAllKibanaTranslationFiles,
  computeLocaleFileHash,
  groupFilesByLocale,
} from './get_kibana_translation_files';
import { initTranslations } from './init_translations';
import { registerRoutes } from './routes';
import { resolveRequestLocale } from './resolve_request_locale';

export interface PrebootDeps {
  http: InternalHttpServicePreboot;
  pluginPaths: string[];
}

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  pluginPaths: string[];
}

export interface StartDeps {
  /** Called at request time to look up the locale saved in the user's profile. */
  getUserSettingLocale: (request: KibanaRequest) => Promise<string | undefined>;
}

export interface InternalI18nServicePreboot {
  getTranslationHash(): string;
  getTranslationHashes(): Record<string, string>;
  getAvailableLocales(): ReadonlyArray<AvailableLocale>;
  allowLocaleCookie: boolean;
}

/**
 * The i18n service start contract.
 * @internal
 */
export interface InternalI18nServiceStart {
  /**
   * Returns a {@link RequestI18nClient} scoped to the locale resolved for the
   * given request. The client memoises the locale on first call so subsequent
   * translate() calls within the same request are synchronous.
   */
  asScopedToRequest(request: KibanaRequest): RequestI18nClient;
}

/** Snapshot of the setup state needed at start/request time. */
interface I18nSetupState {
  defaultLocale: string;
  locales: readonly string[];
  translationHashes: Record<string, string>;
  localeFileMap: Record<string, string[]>;
  allowLocaleCookie: boolean;
}

export class I18nService {
  private readonly log: Logger;
  private readonly configService: IConfigService;
  /** Populated at the end of setup(); consumed by start(). */
  private setupState?: I18nSetupState;
  /** Per-locale translator cache; populated lazily in start(). */
  private readonly translatorCache = new Map<string, ReturnType<typeof createScopedTranslator>>();

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('i18n');
    this.configService = coreContext.configService;
  }

  public async preboot({ pluginPaths, http }: PrebootDeps): Promise<InternalI18nServicePreboot> {
    const {
      defaultLocale,
      availableLocales,
      translationHash,
      translationHashes,
      localeFileMap,
      allowLocaleCookie,
    } = await this.initTranslations(pluginPaths);
    const { dist: isDist } = this.coreContext.env.packageInfo;
    http.registerRoutes('', (router) =>
      registerRoutes({
        router,
        locale: defaultLocale,
        isDist,
        translationHashes,
        localeFileMap,
      })
    );

    return {
      getTranslationHash: () => translationHash,
      getTranslationHashes: () => translationHashes,
      getAvailableLocales: () => availableLocales,
      allowLocaleCookie,
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
      localeFileMap,
      allowLocaleCookie,
    } = await this.initTranslations(pluginPaths);

    this.setupState = {
      defaultLocale,
      locales,
      translationHashes,
      localeFileMap,
      allowLocaleCookie,
    };

    const router = http.createRouter('');
    const { dist: isDist } = this.coreContext.env.packageInfo;
    registerRoutes({
      router,
      locale: defaultLocale,
      isDist,
      translationHashes,
      localeFileMap,
    });

    return {
      getLocale: () => defaultLocale,
      getLocales: () => locales,
      getAvailableLocales: () => availableLocales,
      getTranslationFiles: () => translationFiles,
      getTranslationHash: () => translationHash,
      getTranslationHashes: () => translationHashes,
      allowLocaleCookie,
    };
  }

  public start({ getUserSettingLocale }: StartDeps): InternalI18nServiceStart {
    if (!this.setupState) {
      throw new Error('[I18nService] start() called before setup()');
    }

    const { defaultLocale, locales, translationHashes, localeFileMap, allowLocaleCookie } =
      this.setupState;

    const isServerless = this.coreContext.env.packageInfo.buildFlavor === 'serverless';
    const translatorCache = this.translatorCache;

    const getOrBuildTranslator = async (locale: string) => {
      if (translatorCache.has(locale)) {
        return translatorCache.get(locale)!;
      }

      let translationInput: {
        locale: string;
        messages?: Record<string, string>;
        formats?: unknown;
      };
      if (locale === defaultLocale) {
        // Reuse the messages already loaded into the singleton at boot.
        const existing = i18n.getTranslation();
        translationInput = {
          locale: existing.locale,
          messages: existing.messages as Record<string, string>,
          formats: existing.formats,
        };
      } else {
        // Load from disk (i18nLoader caches parsed files internally).
        const files = localeFileMap[locale] ?? [];
        const loaded = await i18nLoader.getAllTranslationsFromPaths(files);
        const forLocale = loaded[locale] ?? { messages: {} };
        translationInput = { locale, messages: forLocale.messages as Record<string, string> };
      }

      const translator = createScopedTranslator(translationInput);
      translatorCache.set(locale, translator);
      return translator;
    };

    return {
      asScopedToRequest(request: KibanaRequest): RequestI18nClient {
        let resolvedLocale: string | undefined;

        const getLocaleOnce = async (): Promise<string> => {
          if (resolvedLocale !== undefined) {
            return resolvedLocale;
          }
          const userSettingLocale = await getUserSettingLocale(request);
          resolvedLocale = resolveRequestLocale({
            request,
            userSettingLocale,
            configLocale: defaultLocale,
            configuredLocales: locales,
            translationHashes,
            isServerless,
            allowLocaleCookie,
          });
          return resolvedLocale;
        };

        return {
          async getLocale() {
            return getLocaleOnce();
          },

          async translate(id: string, args: ServerTranslateArgs): Promise<string> {
            const locale = await getLocaleOnce();
            const translator = await getOrBuildTranslator(locale);
            return translator.translate(id, {
              defaultMessage: args.defaultMessage,
              values: args.values,
              description: args.description,
              ignoreTag: args.ignoreTag,
            });
          },

          async formatList(
            type: 'conjunction' | 'disjunction' | 'unit',
            values: string[]
          ): Promise<string> {
            const locale = await getLocaleOnce();
            const translator = await getOrBuildTranslator(locale);
            return translator.formatList(type, values);
          },
        };
      },
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

    // Group files by locale so the route handler can locate them for on-demand serving.
    const localeFileMap = groupFilesByLocale(allTranslationFiles);

    // Compute hashes for cache-busted translation URLs. The default locale is already
    // in memory from initTranslations(); non-default locales are hashed from raw file
    // bytes only — no JSON parsing, nothing retained in the loader cache.
    const translationHashes: Record<string, string> = {};
    translationHashes[defaultLocale] = computeHash(JSON.stringify(i18n.getTranslation()));
    for (const locale of locales) {
      if (locale === defaultLocale) continue;
      translationHashes[locale] = await computeLocaleFileHash(localeFileMap[locale] ?? []);
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
      localeFileMap,
      allowLocaleCookie: i18nConfig.allowLocaleCookie,
    };
  }
}

const computeHash = (serialized: string) => {
  return createHash('sha256').update(serialized).digest('hex').slice(0, 12);
};
