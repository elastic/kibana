/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { EnvironmentMode, PackageInfo } from '../config';
import { ICspConfig } from '../csp';
import { InternalHttpServiceSetup, KibanaRequest, LegacyRequest } from '../http';
import { UiPlugins, DiscoveredPlugin } from '../plugins';
import { IUiSettingsClient, UserProvidedValues } from '../ui_settings';
import type { InternalStatusServiceSetup } from '../status';
import { IExternalUrlPolicy } from '../external_url';

/** @internal */
export interface RenderingMetadata {
  strictCsp: ICspConfig['strict'];
  uiPublicUrl: string;
  bootstrapScriptUrl: string;
  i18n: typeof i18n.translate;
  locale: string;
  darkMode: boolean;
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
  render<R extends KibanaRequest | LegacyRequest>(
    request: R,
    uiSettings: IUiSettingsClient,
    options?: IRenderOptions
  ): Promise<string>;
}
