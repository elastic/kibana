/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EnvironmentMode, PackageInfo } from '@kbn/config';
import { i18n } from '@kbn/i18n';
import type { UserProvidedValues } from '../../types/ui_settings';
import type { ICspConfig } from '../csp/csp_config';
import type { IExternalUrlPolicy } from '../external_url/external_url_config';
import { KibanaRequest } from '../http/router/request';
import type { InternalHttpServicePreboot, InternalHttpServiceSetup } from '../http/types';
import type { UiPlugins } from '../plugins/plugins_service';
import type { DiscoveredPlugin } from '../plugins/types';
import type { InternalStatusServiceSetup } from '../status/types';
import type { IUiSettingsClient } from '../ui_settings/types';

/** @internal */
export interface RenderingMetadata {
  strictCsp: ICspConfig['strict'];
  uiPublicUrl: string;
  bootstrapScriptUrl: string;
  i18n: typeof i18n.translate;
  locale: string;
  darkMode: boolean;
  themeVersion?: string;
  stylesheetPaths: string[];
  injectedMetadata: {
    version: string;
    buildNumber: number;
    branch: string;
    basePath: string;
    serverBasePath: string;
    publicBaseUrl?: string;
    env: {
      mode: EnvironmentMode;
      packageInfo: PackageInfo;
    };
    anonymousStatusPage: boolean;
    i18n: {
      translationsUrl: string;
    };
    csp: Pick<ICspConfig, 'warnLegacyBrowsers'>;
    externalUrl: { policy: IExternalUrlPolicy[] };
    vars: Record<string, any>;
    uiPlugins: Array<{
      id: string;
      plugin: DiscoveredPlugin;
      config?: Record<string, unknown>;
    }>;
    legacyMetadata: {
      uiSettings: {
        defaults: Record<string, any>;
        user: Record<string, UserProvidedValues<any>>;
      };
    };
  };
}

/** @internal */
export interface RenderingPrebootDeps {
  http: InternalHttpServicePreboot;
  uiPlugins: UiPlugins;
}

/** @internal */
export interface RenderingSetupDeps {
  http: InternalHttpServiceSetup;
  status: InternalStatusServiceSetup;
  uiPlugins: UiPlugins;
}

/** @public */
export interface IRenderOptions {
  /**
   * Set whether to output user settings in the page metadata.
   * `true` by default.
   */
  includeUserSettings?: boolean;

  /**
   * Inject custom vars into the page metadata.
   * @deprecated for legacy use only, remove with ui_render_mixin
   * @internal
   */
  vars?: Record<string, any>;
}

/** @internal */
export interface InternalRenderingServiceSetup {
  /**
   * Generate a `KibanaResponse` which renders an HTML page bootstrapped
   * with the `core` bundle or the ID of another specified legacy bundle.
   *
   * @example
   * ```ts
   * const html = await rendering.render(request, uiSettings);
   * ```
   */
  render(
    request: KibanaRequest,
    uiSettings: IUiSettingsClient,
    options?: IRenderOptions
  ): Promise<string>;
}

/** @internal */
export type InternalRenderingServicePreboot = InternalRenderingServiceSetup;
