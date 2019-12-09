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
import { format } from 'prettier';
import { take } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { ensureRawRequest } from '../http/router';
import { Template } from './views';
import { RenderingSetupDeps, RenderingServiceSetup } from './types';

/** @internal */
export class RenderingService implements CoreService<RenderingServiceSetup> {
  constructor(private readonly coreContext: CoreContext) {}

  public async setup({
    http,
    legacy,
    legacyPlugins,
    plugins,
  }: RenderingSetupDeps): Promise<RenderingServiceSetup> {
    const uiPlugins = await Promise.all(
      [...plugins.uiPlugins.public].map(async ([pluginId, plugin]) => {
        const config = ((await plugins.uiPlugins.browserConfigs
          .get(pluginId)
          ?.pipe(take(1))
          .toPromise()) ?? {}) as Record<string, any>;

        return { id: pluginId, plugin, config };
      })
    );

    return {
      getRenderingProvider: ({ request, uiSettings, injectedVarsOverrides }) => {
        const basePath = http.basePath.get(request);

        return {
          render: async (
            id = 'core',
            options: { includeUserSettings: boolean } = { includeUserSettings: true }
          ) => {
            const { env } = this.coreContext;
            const settings = {
              defaults: await uiSettings.getAll(),
              user: options.includeUserSettings ? await uiSettings.getUserProvided() : {},
            };
            const vars = await legacy.getVars(
              id,
              ensureRawRequest(request),
              uiPlugins.map(({ config }) => config),
              injectedVarsOverrides
            );
            const metadata = {
              strictCsp: http.csp.strict,
              uiPublicUrl: `${basePath}/ui`,
              bootstrapScriptUrl: `${basePath}/bundles/app/${id}/bootstrap.js`,
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
                legacyMode: id !== 'core',
                i18n: {
                  translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
                },
                csp: { warnLegacyBrowsers: http.csp.warnLegacyBrowsers },
                vars,
                uiPlugins,
                legacyMetadata: {
                  app: {},
                  bundleId: `app:${id}`,
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

            const markup = `<!DOCTYPE html>${renderToStaticMarkup(
              <Template metadata={metadata} />
            )}`;

            return format(markup, { parser: 'html' });
          },
        };
      },
    };
  }

  public async start() {}

  public async stop() {}
}
