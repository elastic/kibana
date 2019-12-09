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

import { CspOptions, InternalHttpServiceSetup, KibanaRequest, LegacyRequest } from '../http';
import { IUiSettingsClient, UserProvidedValues } from '../ui_settings';
import { Env } from '../config';
import { PluginsServiceSetup, DiscoveredPlugin } from '../plugins';
import { ILegacyService, LegacyServiceDiscoverPlugins } from '../legacy';

/** @internal */
export interface RenderingMetadata {
  strictCsp: CspOptions['strict'];
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
    env: Env;
    legacyMode: boolean;
    i18n: {
      translationsUrl: string;
    };
    csp: Pick<CspOptions, 'warnLegacyBrowsers'>;
    vars: Record<string, any>;
    uiPlugins: Array<{
      id: string;
      plugin: DiscoveredPlugin;
      config: unknown;
    }>;
    legacyMetadata: {
      app: {};
      bundleId: string;
      nav: Array<Record<string, unknown>>;
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
  legacy: ILegacyService;
  legacyPlugins: LegacyServiceDiscoverPlugins;
  plugins: PluginsServiceSetup;
}

/** @internal */
export interface RenderingProviderParams {
  request: KibanaRequest | LegacyRequest;
  uiSettings: IUiSettingsClient;
  /**
   * @deprecated legacy
   */
  injectedVarsOverrides?: Record<string, any>;
}

/**
 * @public
 * Provides a client for independently rendering HTML
 */
export interface IRenderingProvider {
  /**
   * Generate a KibanaResponse which renders an HTML page bootstrapped
   * with the core bundle or the ID of another specified bundle.
   * Intended as a response body for HTTP route handlers.
   *
   * * @example
   * ```ts
   * router.get(
   *   { path: '/', validate: false },
   *   (context, request, response) =>
   *     response.ok({
   *       headers: {
   *         'content-security-policy': context.core.http.csp.directives,
   *       },
   *       body: await context.core.rendering.render(),
   *     })
   * );
   * ```
   *
   * @param pluginId Provide optional variables to inject in the page.
   * @param injectedVarsOverrides Provide optional variables to inject in the page.
   * @param includeUserProvidedConfig Optionally disable injecting user-provided settings in the page
   */
  render(pluginId?: string, options?: { includeUserSettings?: boolean }): Promise<string>;
}

/** @public */
export interface RenderingServiceSetup {
  /**
   * Generate a client for independently rendering HTML
   */
  getRenderingProvider: (params: RenderingProviderParams) => IRenderingProvider;
}
