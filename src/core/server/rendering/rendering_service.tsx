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

import { UiPlugins } from '../plugins';
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Template } from './views';
import { LegacyService } from '../legacy';
import {
  IRenderOptions,
  RenderingSetupDeps,
  InternalRenderingServiceSetup,
  RenderingMetadata,
} from './types';

/** @internal */
export class RenderingService implements CoreService<InternalRenderingServiceSetup> {
  private legacyInternals?: LegacyService['legacyInternals'];
  constructor(private readonly coreContext: CoreContext) {}

  public async setup({
    http,
    status,
    legacyPlugins,
    uiPlugins,
  }: RenderingSetupDeps): Promise<InternalRenderingServiceSetup> {
    return {
      render: async (
        request,
        uiSettings,
        { app = { getId: () => 'core' }, includeUserSettings = true, vars }: IRenderOptions = {}
      ) => {
        if (!this.legacyInternals) {
          throw new Error('Cannot render before "start"');
        }
        const env = {
          mode: this.coreContext.env.mode,
          packageInfo: this.coreContext.env.packageInfo,
        };
        const basePath = http.basePath.get(request);
        const serverBasePath = http.basePath.serverBasePath;
        const settings = {
          defaults: uiSettings.getRegistered(),
          user: includeUserSettings ? await uiSettings.getUserProvided() : {},
        };
        const appId = app.getId();
        const metadata: RenderingMetadata = {
          strictCsp: http.csp.strict,
          uiPublicUrl: `${basePath}/ui`,
          bootstrapScriptUrl: `${basePath}/bootstrap.js`,
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
            serverBasePath,
            env,
            legacyMode: false,
            anonymousStatusPage: status.isStatusPageAnonymous(),
            i18n: {
              translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
            },
            csp: { warnLegacyBrowsers: http.csp.warnLegacyBrowsers },
            vars: vars ?? (await this.legacyInternals!.getVars('core', request)),
            uiPlugins: await Promise.all(
              [...uiPlugins.public].map(async ([id, plugin]) => ({
                id,
                plugin,
                config: await this.getUiConfig(uiPlugins, id),
              }))
            ),
            legacyMetadata: {
              app,
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

  public async start({ legacy }: { legacy: LegacyService }) {
    this.legacyInternals = legacy.legacyInternals;
  }

  public async stop() {}

  private async getUiConfig(uiPlugins: UiPlugins, pluginId: string) {
    const browserConfig = uiPlugins.browserConfigs.get(pluginId);

    return ((await browserConfig?.pipe(take(1)).toPromise()) ?? {}) as Record<string, any>;
  }
}
