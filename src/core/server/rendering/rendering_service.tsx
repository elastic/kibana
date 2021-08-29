/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { take } from 'rxjs/operators';
import type { CoreContext } from '../core_context';
import { KibanaRequest } from '../http/router/request';
import type { UiPlugins } from '../plugins/plugins_service';
import type { IUiSettingsClient } from '../ui_settings/types';
import { bootstrapRendererFactory } from './bootstrap/bootstrap_renderer';
import { registerBootstrapRoute } from './bootstrap/register_bootstrap_route';
import { getSettingValue, getStylesheetPaths } from './render_utils';
import type {
  InternalRenderingServicePreboot,
  InternalRenderingServiceSetup,
  IRenderOptions,
  RenderingMetadata,
  RenderingPrebootDeps,
  RenderingSetupDeps,
} from './types';
import { Template } from './views/template';

type RenderOptions = (RenderingPrebootDeps & { status?: never }) | RenderingSetupDeps;

/** @internal */
export class RenderingService {
  constructor(private readonly coreContext: CoreContext) {}

  public async preboot({
    http,
    uiPlugins,
  }: RenderingPrebootDeps): Promise<InternalRenderingServicePreboot> {
    http.registerRoutes('', (router) => {
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
    http,
    status,
    uiPlugins,
  }: RenderingSetupDeps): Promise<InternalRenderingServiceSetup> {
    registerBootstrapRoute({
      router: http.createRouter(''),
      renderer: bootstrapRendererFactory({
        uiPlugins,
        serverBasePath: http.basePath.serverBasePath,
        packageInfo: this.coreContext.env.packageInfo,
        auth: http.auth,
      }),
    });

    return {
      render: this.render.bind(this, { http, uiPlugins, status }),
    };
  }

  private async render(
    { http, uiPlugins, status }: RenderOptions,
    request: KibanaRequest,
    uiSettings: IUiSettingsClient,
    { includeUserSettings = true, vars }: IRenderOptions = {}
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
      user: includeUserSettings ? await uiSettings.getUserProvided() : {},
    };

    const darkMode = getSettingValue('theme:darkMode', settings, Boolean);
    const themeVersion = getSettingValue('theme:version', settings, String);

    const stylesheetPaths = getStylesheetPaths({
      darkMode,
      themeVersion,
      basePath: serverBasePath,
      buildNum,
    });

    const metadata: RenderingMetadata = {
      strictCsp: http.csp.strict,
      uiPublicUrl: `${basePath}/ui`,
      bootstrapScriptUrl: `${basePath}/bootstrap.js`,
      i18n: i18n.translate,
      locale: i18n.getLocale(),
      darkMode,
      stylesheetPaths,
      themeVersion,
      injectedMetadata: {
        version: env.packageInfo.version,
        buildNumber: env.packageInfo.buildNum,
        branch: env.packageInfo.branch,
        basePath,
        serverBasePath,
        publicBaseUrl,
        env,
        anonymousStatusPage: status?.isStatusPageAnonymous() ?? false,
        i18n: {
          translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
        },
        csp: { warnLegacyBrowsers: http.csp.warnLegacyBrowsers },
        externalUrl: http.externalUrl,
        vars: vars ?? {},
        uiPlugins: await Promise.all(
          [...uiPlugins.public].map(async ([id, plugin]) => ({
            id,
            plugin,
            config: await getUiConfig(uiPlugins, id),
          }))
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
  return ((await browserConfig?.pipe(take(1)).toPromise()) ?? {}) as Record<string, any>;
};
