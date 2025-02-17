/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BehaviorSubject, firstValueFrom, of, map, catchError, take, timeout } from 'rxjs';
import { i18n as i18nLib } from '@kbn/i18n';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { KibanaRequest, HttpAuth } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import {
  type DarkModeValue,
  type ThemeName,
  parseDarkModeValue,
  parseThemeNameValue,
  type UiSettingsParams,
  type UserProvidedValues,
  DEFAULT_THEME_NAME,
} from '@kbn/core-ui-settings-common';
import { Template } from './views';
import {
  IRenderOptions,
  RenderingPrebootDeps,
  RenderingSetupDeps,
  InternalRenderingServicePreboot,
  InternalRenderingServiceSetup,
  RenderingMetadata,
  RenderingStartDeps,
} from './types';
import { registerBootstrapRoute, bootstrapRendererFactory } from './bootstrap';
import {
  getSettingValue,
  getCommonStylesheetPaths,
  getThemeStylesheetPaths,
  getScriptPaths,
  getBrowserLoggingConfig,
} from './render_utils';
import { filterUiPlugins } from './filter_ui_plugins';
import { getApmConfig } from './get_apm_config';
import type { InternalRenderingRequestHandlerContext } from './internal_types';

type RenderOptions =
  | RenderingSetupDeps
  | (RenderingPrebootDeps & {
      status?: never;
      elasticsearch?: never;
      featureFlags?: never;
      customBranding?: never;
      userSettings?: never;
    });

const themeVersion: ThemeVersion = 'v8';

// TODO: Remove the temporary feature flag and supporting code when Borealis is live in Serverless
// https://github.com/elastic/eui-private/issues/192
export const DEFAULT_THEME_NAME_FEATURE_FLAG = 'coreRendering.defaultThemeName';

/** @internal */
export class RenderingService {
  private readonly themeName$ = new BehaviorSubject<ThemeName>(DEFAULT_THEME_NAME);

  constructor(private readonly coreContext: CoreContext) {}

  public async preboot({
    http,
    uiPlugins,
    i18n,
  }: RenderingPrebootDeps): Promise<InternalRenderingServicePreboot> {
    http.registerRoutes<InternalRenderingRequestHandlerContext>('', (router) => {
      registerBootstrapRoute({
        router,
        renderer: bootstrapRendererFactory({
          uiPlugins,
          baseHref: http.staticAssets.getHrefBase(),
          packageInfo: this.coreContext.env.packageInfo,
          auth: http.auth,
          themeName$: this.themeName$,
        }),
      });
    });

    return {
      render: this.render.bind(this, { http, uiPlugins, i18n }),
    };
  }

  public async setup({
    elasticsearch,
    featureFlags,
    http,
    status,
    uiPlugins,
    customBranding,
    userSettings,
    i18n,
  }: RenderingSetupDeps): Promise<InternalRenderingServiceSetup> {
    registerBootstrapRoute({
      router: http.createRouter<InternalRenderingRequestHandlerContext>(''),
      renderer: bootstrapRendererFactory({
        uiPlugins,
        baseHref: http.staticAssets.getHrefBase(),
        packageInfo: this.coreContext.env.packageInfo,
        auth: http.auth,
        themeName$: this.themeName$,
        userSettingsService: userSettings,
      }),
    });

    return {
      render: this.render.bind(this, {
        elasticsearch,
        featureFlags,
        http,
        uiPlugins,
        status,
        customBranding,
        userSettings,
        i18n,
      }),
    };
  }

  public start({ featureFlags }: RenderingStartDeps) {
    featureFlags
      .getStringValue$<ThemeName>(DEFAULT_THEME_NAME_FEATURE_FLAG, DEFAULT_THEME_NAME)
      // Parse the input feature flag value to ensure it's of type ThemeName
      .pipe(map((value) => parseThemeNameValue(value)))
      .subscribe(this.themeName$);
  }

  private async render(
    renderOptions: RenderOptions,
    request: KibanaRequest,
    uiSettings: {
      client: IUiSettingsClient;
      globalClient: IUiSettingsClient;
    },
    { isAnonymousPage = false, includeExposedConfigKeys }: IRenderOptions = {}
  ) {
    const {
      elasticsearch,
      featureFlags,
      http,
      uiPlugins,
      status,
      customBranding,
      userSettings,
      i18n,
    } = renderOptions;

    const env = {
      mode: this.coreContext.env.mode,
      packageInfo: this.coreContext.env.packageInfo,
    };
    const staticAssetsHrefBase = http.staticAssets.getHrefBase();
    const usingCdn = http.staticAssets.isUsingCdn();
    const basePath = http.basePath.get(request);
    const { serverBasePath, publicBaseUrl } = http.basePath;

    // Grouping all async HTTP requests to run them concurrently for performance reasons.
    const [
      defaultSettings,
      settingsUserValues = {},
      globalSettingsUserValues = {},
      userSettingDarkMode,
    ] = await Promise.all([
      // All sites
      withAsyncDefaultValues(request, uiSettings.client?.getRegistered()),
      // Only non-anonymous pages
      ...(!isAnonymousPage
        ? ([
            uiSettings.client?.getUserProvided(),
            uiSettings.globalClient?.getUserProvided(),
            // dark mode
            userSettings?.getUserSettingDarkMode(request),
          ] as [
            Promise<Record<string, UserProvidedValues>>,
            Promise<Record<string, UserProvidedValues>>,
            Promise<DarkModeValue> | undefined
          ])
        : []),
    ]);

    const settings = {
      defaults: defaultSettings,
      user: settingsUserValues,
    };
    const globalSettings = {
      defaults: uiSettings.globalClient?.getRegistered() ?? {},
      user: globalSettingsUserValues,
    };

    let clusterInfo = {};
    let branding: CustomBranding = {};
    try {
      // Only provide the clusterInfo if the request is authenticated and the elasticsearch service is available.
      const authenticated = isAuthenticated(http.auth, request);
      if (authenticated && elasticsearch) {
        clusterInfo = await firstValueFrom(
          elasticsearch.clusterInfo$.pipe(
            timeout(50), // If not available, just return undefined
            catchError(() => of({}))
          )
        );
      }
      branding = await customBranding?.getBrandingFor(request, {
        unauthenticated: !authenticated,
      })!;
    } catch (err) {
      // swallow error
    }

    // dark mode
    const isThemeOverridden = settings.user['theme:darkMode']?.isOverridden ?? false;

    let darkMode: DarkModeValue;
    if (userSettingDarkMode !== undefined && !isThemeOverridden) {
      darkMode = userSettingDarkMode;
    } else {
      darkMode = getSettingValue<DarkModeValue>('theme:darkMode', settings, parseDarkModeValue);
    }

    const themeStylesheetPaths = (mode: boolean) =>
      getThemeStylesheetPaths({
        darkMode: mode,
        baseHref: staticAssetsHrefBase,
      });
    const commonStylesheetPaths = getCommonStylesheetPaths({
      baseHref: staticAssetsHrefBase,
    });
    const scriptPaths = getScriptPaths({
      darkMode,
      baseHref: staticAssetsHrefBase,
    });

    const loggingConfig = await getBrowserLoggingConfig(this.coreContext.configService);

    const locale = i18nLib.getLocale();
    let translationsUrl: string;
    if (usingCdn) {
      translationsUrl = `${staticAssetsHrefBase}/translations/${locale}.json`;
    } else {
      const translationHash = i18n.getTranslationHash();
      translationsUrl = `${serverBasePath}/translations/${translationHash}/${locale}.json`;
    }

    const apmConfig = getApmConfig(request.url.pathname);
    const filteredPlugins = filterUiPlugins({ uiPlugins, isAnonymousPage });
    const bootstrapScript = isAnonymousPage ? 'bootstrap-anonymous.js' : 'bootstrap.js';
    const metadata: RenderingMetadata = {
      strictCsp: http.csp.strict,
      hardenPrototypes: http.prototypeHardening,
      uiPublicUrl: `${staticAssetsHrefBase}/ui`,
      bootstrapScriptUrl: `${basePath}/${bootstrapScript}`,
      locale,
      themeVersion,
      darkMode,
      stylesheetPaths: commonStylesheetPaths,
      scriptPaths,
      customBranding: {
        faviconSVG: branding?.faviconSVG,
        faviconPNG: branding?.faviconPNG,
        pageTitle: branding?.pageTitle,
        logo: branding?.logo,
      },
      injectedMetadata: {
        version: env.packageInfo.version,
        buildNumber: env.packageInfo.buildNum,
        branch: env.packageInfo.branch,
        basePath,
        serverBasePath,
        publicBaseUrl,
        assetsHrefBase: staticAssetsHrefBase,
        logging: loggingConfig,
        env,
        featureFlags: {
          overrides: featureFlags?.getOverrides() || {},
        },
        clusterInfo,
        apmConfig,
        anonymousStatusPage: status?.isStatusPageAnonymous() ?? false,
        i18n: {
          translationsUrl,
        },
        theme: {
          darkMode,
          name: this.themeName$.getValue(),
          version: themeVersion,
          stylesheetPaths: {
            default: themeStylesheetPaths(false),
            dark: themeStylesheetPaths(true),
          },
        },
        customBranding: {
          logo: branding?.logo,
          customizedLogo: branding?.customizedLogo,
          pageTitle: branding?.pageTitle,
        },
        csp: { warnLegacyBrowsers: http.csp.warnLegacyBrowsers },
        externalUrl: http.externalUrl,
        uiPlugins: await Promise.all(
          filteredPlugins.map(async ([id, plugin]) => {
            const { browserConfig, exposedConfigKeys } = await getUiConfig(uiPlugins, id);
            return {
              id,
              plugin,
              config: browserConfig,
              ...(includeExposedConfigKeys && { exposedConfigKeys }),
            };
          })
        ),
        legacyMetadata: {
          uiSettings: settings,
          globalUiSettings: globalSettings,
        },
      },
    };

    return `<!DOCTYPE html>${renderToStaticMarkup(<Template metadata={metadata} />)}`;
  }

  public async stop() {}
}

const getUiConfig = async (uiPlugins: UiPlugins, pluginId: string) => {
  const browserConfig = uiPlugins.browserConfigs.get(pluginId);
  return ((await browserConfig?.pipe(take(1)).toPromise()) ?? {
    browserConfig: {},
    exposedConfigKeys: {},
  }) as { browserConfig: Record<string, unknown>; exposedConfigKeys: Record<string, string> };
};

const isAuthenticated = (auth: HttpAuth, request: KibanaRequest) => {
  const { status: authStatus } = auth.get(request);
  // status is 'unknown' when auth is disabled. we just need to not be `unauthenticated` here.
  return authStatus !== 'unauthenticated';
};

/**
 * Load async values from the definitions that have a `getValue()` function
 *
 * @param defaultSettings The default settings to add async values to
 * @param request The current KibanaRequest
 * @returns The default settings with values updated with async values
 */
const withAsyncDefaultValues = async (
  request: KibanaRequest,
  defaultSettings: Readonly<Record<string, Omit<UiSettingsParams, 'schema'>>> = {}
): Promise<Readonly<Record<string, Omit<UiSettingsParams, 'schema'>>>> => {
  const updatedSettings = { ...defaultSettings };

  await Promise.all(
    Object.entries(defaultSettings)
      .filter(([_, definition]) => typeof definition.getValue === 'function')
      .map(([key, definition]) => {
        return definition.getValue!({ request }).then((value) => {
          updatedSettings[key] = { ...definition, value };
        });
      })
  );

  return updatedSettings;
};
