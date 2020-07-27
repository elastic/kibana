/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';

import { Env } from '../config';
import { ICspConfig } from '../csp';
import { InternalHttpServiceSetup, KibanaRequest, LegacyRequest } from '../http';
import { LegacyNavLink, LegacyServiceDiscoverPlugins } from '../legacy';
import { UiPlugins, DiscoveredPlugin } from '../plugins';
import { IUiSettingsClient, UserProvidedValues } from '../ui_settings';
import type { InternalStatusServiceSetup } from '../status';

/** @internal */
export interface RenderingMetadata {
  strictCsp: ICspConfig['strict'];
  uiPublicUrl: string;
  bootstrapScriptUrl: string;
  i18n: typeof i18n.translate;
  locale: string;
  darkMode: boolean;
  injectedMetadata: {
    version: string;
    buildNumber: number;
    branch: string;
    basePath: string;
    serverBasePath: string;
    env: Env;
    legacyMode: boolean;
    anonymousStatusPage: boolean;
    i18n: {
      translationsUrl: string;
    };
    csp: Pick<ICspConfig, 'warnLegacyBrowsers'>;
    vars: Record<string, any>;
    uiPlugins: Array<{
      id: string;
      plugin: DiscoveredPlugin;
      config?: Record<string, unknown>;
    }>;
    legacyMetadata: {
      app: { getId(): string };
      bundleId: string;
      nav: LegacyNavLink[];
      version: string;
      branch: string;
      buildNum: number;
      buildSha: string;
      serverName: string;
      devMode: boolean;
      basePath: string;
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
  legacyPlugins: LegacyServiceDiscoverPlugins;
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
   * Render the bootstrapped HTML content for an optional legacy application.
   * Defaults to `core`.
   * @deprecated for legacy use only, remove with ui_render_mixin
   * @internal
   */
  app?: { getId(): string };

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
