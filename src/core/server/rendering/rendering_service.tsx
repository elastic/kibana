/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { catchError, take, timeout } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';

import { firstValueFrom, of } from 'rxjs';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { KibanaRequest, HttpAuth } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { UiPlugins } from '../plugins';
import { Template } from './views';
import {
  IRenderOptions,
  RenderingPrebootDeps,
  RenderingSetupDeps,
  InternalRenderingServicePreboot,
  InternalRenderingServiceSetup,
  RenderingMetadata,
} from './types';
import { registerBootstrapRoute, bootstrapRendererFactory } from './bootstrap';
import { getSettingValue, getStylesheetPaths } from './render_utils';
import { filterUiPlugins } from './filter_ui_plugins';
import type { InternalRenderingRequestHandlerContext } from './internal_types';

type RenderOptions =
  | (RenderingPrebootDeps & { status?: never; elasticsearch?: never })
  | RenderingSetupDeps;

/** @internal */
export class RenderingService {
  constructor(private readonly coreContext: CoreContext) {}

  public async preboot({
    http,
    uiPlugins,
  }: RenderingPrebootDeps): Promise<InternalRenderingServicePreboot> {
    http.registerRoutes<InternalRenderingRequestHandlerContext>('', (router) => {
      registerBootstrapRoute({
        router,
        renderer: bootstrapRendererFactory({
          uiPlugins,
          serverBasePath: http.basePath.serverBasePath,
          packageInfo: this.coreContext.env.packageInfo,
          auth: http.auth,
        }),
      });
    });

    return {
      render: this.render.bind(this, { http, uiPlugins }),
    };
  }

  public async setup({
    elasticsearch,
    http,
    status,
    uiPlugins,
  }: RenderingSetupDeps): Promise<InternalRenderingServiceSetup> {
    registerBootstrapRoute({
      router: http.createRouter<InternalRenderingRequestHandlerContext>(''),
      renderer: bootstrapRendererFactory({
        uiPlugins,
        serverBasePath: http.basePath.serverBasePath,
        packageInfo: this.coreContext.env.packageInfo,
        auth: http.auth,
      }),
    });

    return {
      render: this.render.bind(this, { elasticsearch, http, uiPlugins, status }),
    };
  }

  private async render(
    { elasticsearch, http, uiPlugins, status }: RenderOptions,
    request: KibanaRequest,
    uiSettings: IUiSettingsClient,
    { isAnonymousPage = false, vars, includeExposedConfigKeys }: IRenderOptions = {}
  ) {
    const env = {
      mode: this.coreContext.env.mode,
      packageInfo: this.coreContext.env.packageInfo,
    };
    const buildNum = env.packageInfo.buildNum;
    const basePath = http.basePath.get(request);
    const { serverBasePath, publicBaseUrl } = http.basePath;
    const settings = {
      defaults: uiSettings.getRegistered() ?? {},
      user: isAnonymousPage ? {} : await uiSettings.getUserProvided(),
    };

    let clusterInfo = {};
    try {
      // Only provide the clusterInfo if the request is authenticated and the elasticsearch service is available.
      if (isAuthenticated(http.auth, request) && elasticsearch) {
        clusterInfo = await firstValueFrom(
          elasticsearch.clusterInfo$.pipe(
            timeout(50), // If not available, just return undefined
            catchError(() => of({}))
          )
        );
      }
    } catch (err) {
      // swallow error
    }

    const darkMode = getSettingValue('theme:darkMode', settings, Boolean);
    const themeVersion: ThemeVersion = 'v8';

    const stylesheetPaths = getStylesheetPaths({
      darkMode,
      themeVersion,
      basePath: serverBasePath,
      buildNum,
    });

    const filteredPlugins = filterUiPlugins({ uiPlugins, isAnonymousPage });
    const bootstrapScript = isAnonymousPage ? 'bootstrap-anonymous.js' : 'bootstrap.js';
    const metadata: RenderingMetadata = {
      strictCsp: http.csp.strict,
      uiPublicUrl: `${basePath}/ui`,
      bootstrapScriptUrl: `${basePath}/${bootstrapScript}`,
      i18n: i18n.translate,
      locale: i18n.getLocale(),
      darkMode,
      themeVersion,
      stylesheetPaths,
      injectedMetadata: {
        version: env.packageInfo.version,
        buildNumber: env.packageInfo.buildNum,
        branch: env.packageInfo.branch,
        basePath,
        serverBasePath,
        publicBaseUrl,
        env,
        clusterInfo,
        anonymousStatusPage: status?.isStatusPageAnonymous() ?? false,
        i18n: {
          translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
        },
        theme: {
          darkMode,
          version: themeVersion,
        },
        csp: { warnLegacyBrowsers: http.csp.warnLegacyBrowsers },
        externalUrl: http.externalUrl,
        vars: vars ?? {},
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
