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

import { compileFile } from 'pug';
import { join } from 'path';

import { i18n } from '@kbn/i18n';

import { LegacyServiceSetup } from '../legacy';
import { Env } from '../config';
import { InternalHttpServiceSetup, KibanaRequest, KibanaResponseFactory } from '../http';
import { PluginsServiceSetup } from '../plugins';
import { createCspRuleString } from '../csp';
import { mergeCapabilities } from './capabilities';
import { mergeVariables } from './merge_variables';
import { IApplicationContextProvider } from './types';

interface Params {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  env: Env;
  legacy: LegacyServiceSetup;
  http: InternalHttpServiceSetup;
  uiSettings: Record<string, any>;
  plugins: PluginsServiceSetup;
}

interface PluginSpec {
  readConfigValue: (config: any, key: any) => any;
}

interface Provider<T = object> {
  fn: (
    server: InternalHttpServiceSetup['server'],
    config: ReturnType<PluginSpec['readConfigValue']>
  ) => T;
  pluginSpec: PluginSpec;
}

type App = ReturnType<InternalHttpServiceSetup['server']['getUiAppById']>;
type Replacer<T = object> = (
  variables: T,
  request: KibanaRequest,
  server: InternalHttpServiceSetup['server']
) => Promise<T> | T;

export class ApplicationContextProvider implements IApplicationContextProvider {
  private readonly request!: KibanaRequest;
  private readonly response!: KibanaResponseFactory;
  private readonly env!: Env;
  private readonly legacy!: LegacyServiceSetup;
  private readonly http!: InternalHttpServiceSetup;
  private readonly uiSettings!: Record<string, any>;
  private readonly plugins!: PluginsServiceSetup;
  private readonly template = compileFile(join(__dirname, 'views/ui_app.pug'));

  constructor(params: Params) {
    Object.assign(this, params);
  }

  private getCapabilities() {
    const modifiers = this.http.server.getCapabilitiesModifiers();
    const defaultCapabilties = this.http.server.getDefaultCapabilities();
    const capabilities = mergeCapabilities(defaultCapabilties, {
      // Get legacy nav links
      navLinks: Object.assign(
        {},
        ...this.http.server.getUiNavLinks().map(({ _id }) => ({ [_id]: true }))
      ),
    });

    return modifiers.reduce(
      async (resolvedCapabilties, modifier) => modifier(this.request, await resolvedCapabilties),
      Promise.resolve(capabilities)
    );
  }

  private async getVariables(app: App, basePath: string, injectedOverrides: Record<string, any>) {
    const providers: Provider[] = (this.legacy.uiExports as any).defaultInjectedVarProviders || [];
    const replacers: Replacer[] = (this.legacy.uiExports as any).injectedVarsReplacers || [];
    const defaultInjectedVars = providers.reduce(
      (defaults, { fn, pluginSpec }) =>
        mergeVariables(
          defaults,
          fn(this.http.server, pluginSpec.readConfigValue(this.http.server.config, []))
        ),
      {}
    );
    const appInjectedVars = await this.http.server.getInjectedUiAppVars(app.getId());
    const injectedVars = mergeVariables(defaultInjectedVars, appInjectedVars, injectedOverrides);
    const vars = await replacers.reduce(
      async (variables, replacer) => await replacer(variables, this.request, this.http.server),
      Promise.resolve(injectedVars)
    );

    return {
      strictCsp: this.http.csp.strict,
      uiPublicUrl: `${basePath}/ui`,
      bootstrapScriptUrl: `${basePath}/bundles/app/${app.getId()}/bootstrap.js`,
      i18n: i18n.translate,
      locale: i18n.getLocale(),
      darkMode: this.uiSettings?.user?.['theme:darkMode']?.userValue ?? false,
      injectedMetadata: {
        version: this.http.server.version,
        buildNumber: this.env.packageInfo.buildNum,
        branch: this.env.packageInfo.branch,
        basePath,
        env: this.env,
        legacyMode: app.getId() !== 'core',
        i18n: {
          translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
        },
        csp: {
          warnLegacyBrowsers: this.http.csp.warnLegacyBrowsers,
        },
        vars,
        uiPlugins: [...this.plugins.uiPlugins.public].map(([id, plugin]) => ({ id, plugin })),
        legacyMetadata: {
          app,
          bundleId: `app:${app.getId()}`,
          nav: this.http.server.getUiNavLinks(),
          env: this.env,
          version: this.env.packageInfo.version,
          branch: this.env.packageInfo.branch,
          buildNum: this.env.packageInfo.buildNum,
          buildSha: this.env.packageInfo.buildSha,
          serverName: this.http.server.name,
          devMode: this.env.mode.dev,
          basePath,
          uiSettings: this.uiSettings,
        },
        capabilities: await this.getCapabilities(),
      },
    };
  }

  public async render(appId: string, injectedVarsOverrides: Record<string, any> = {}) {
    try {
      const app = this.http.server.getUiAppById(appId) || { getId: () => 'core' };
      const variables = await this.getVariables(
        app,
        this.http.basePath.get(this.request),
        injectedVarsOverrides
      );
      const content = this.template(variables);

      return this.response.ok({
        body: content,
        headers: {
          'content-security-policy': createCspRuleString(this.http.csp.rules),
        },
      });
    } catch (err) {
      return this.response.internalError({
        body: `Unable to render application with the id ${appId}`,
      });
    }
  }
}
