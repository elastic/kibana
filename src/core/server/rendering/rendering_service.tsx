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

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { take } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Template } from './views';
import {
  RenderingSetupDeps,
  RenderingServiceSetup,
  RenderingMetadata,
  InternalRenderOptions,
} from './types';

/** @internal */
export class RenderingService implements CoreService<RenderingServiceSetup> {
  constructor(private readonly coreContext: CoreContext) {}

  public async setup({
    http,
    legacyPlugins,
    plugins,
  }: RenderingSetupDeps): Promise<RenderingServiceSetup> {
    async function getUiConfig(pluginId: string) {
      const browserConfig = plugins.uiPlugins.browserConfigs.get(pluginId);

      return ((await browserConfig?.pipe(take(1)).toPromise()) ?? {}) as Record<string, any>;
    }

    return {
      render: async (
        request,
        uiSettings,
        {
          appId = 'core',
          includeUserSettings = true,
          injectedVarsOverrides = {},
        }: InternalRenderOptions = {}
      ) => {
        const { env } = this.coreContext;
        const basePath = http.basePath.get(request);
        const settings = {
          defaults: uiSettings.getRegistered(),
          user: includeUserSettings ? await uiSettings.getUserProvided() : {},
        };
        const metadata: RenderingMetadata = {
          strictCsp: http.csp.strict,
          uiPublicUrl: `${basePath}/ui`,
          bootstrapScriptUrl: `${basePath}/bundles/app/${appId}/bootstrap.js`,
          i18n: i18n.translate,
          locale: i18n.getLocale(),
          darkMode: settings.user?.['theme:darkMode']?.userValue
            ? Boolean(settings.user['theme:darkMode'].userValue)
            : false,
          injectedMetadata: {
            version: env.packageInfo.version,
            buildNumber: env.packageInfo.buildNum,
            branch: env.packageInfo.branch,
            basePath,
            env,
            legacyMode: appId !== 'core',
            i18n: {
              translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
            },
            csp: { warnLegacyBrowsers: http.csp.warnLegacyBrowsers },
            vars: injectedVarsOverrides,
            uiPlugins: await Promise.all(
              [...plugins.uiPlugins.public].map(async ([id, plugin]) => ({
                id,
                plugin,
                config: await getUiConfig(id),
              }))
            ),
            legacyMetadata: {
              app: { getId: () => appId },
              bundleId: `app:${appId}`,
              nav: legacyPlugins.navLinks,
              version: env.packageInfo.version,
              branch: env.packageInfo.branch,
              buildNum: env.packageInfo.buildNum,
              buildSha: env.packageInfo.buildSha,
              serverName: http.server.name,
              devMode: env.mode.dev,
              basePath,
              uiSettings: settings,
            },
          },
        };

        return `<!DOCTYPE html>${renderToStaticMarkup(<Template metadata={metadata} />)}`;
      },
    };
  }

  public async start() {}

  public async stop() {}
}
