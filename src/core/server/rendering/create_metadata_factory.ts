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

import { take } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';

import { mergeVariables } from './merge_variables';
import { RenderingMetadata, RenderingProviderParams, PluginVariables } from './types';

async function getVariables(
  id: string,
  pluginConfigs: PluginVariables[],
  params: RenderingProviderParams
) {
  const config = (params.http.server as any).config();
  const defaultVars =
    params.legacyPlugins.uiExports.defaultInjectedVarProviders?.reduce(
      (defaults, { fn, pluginSpec }) =>
        mergeVariables(fn(params.http.server, pluginSpec.readConfigValue(config, [])), defaults),
      {}
    ) ?? {};
  const injectedVars = mergeVariables(
    defaultVars,
    ...pluginConfigs,
    await params.getVarsFor(id),
    params.injectedVarsOverrides || {}
  );

  return (
    params.legacyPlugins.uiExports.injectedVarsReplacers?.reduce(
      async (vars, replacer) => await replacer(vars, params.request, params.http.server),
      injectedVars
    ) ?? injectedVars
  );
}

function getUiPlugins(params: RenderingProviderParams) {
  return Promise.all(
    [...params.plugins.uiPlugins.public].map(async ([pluginId, plugin]) => {
      const config = (await params.plugins.uiPlugins.browserConfigs
        .get(pluginId)
        ?.pipe(take(1))
        .toPromise()) as PluginVariables;

      return { id: pluginId, plugin, config: config || {} };
    })
  );
}

async function getSettings(params: RenderingProviderParams, includeUserProvidedConfig: boolean) {
  return {
    defaults: await params.uiSettings.getAll(),
    user: includeUserProvidedConfig ? await params.uiSettings.getUserProvided() : {},
  };
}

/**
 * Returns a function that generates all the metadata necessary for rendering a boostrapped page.
 */
export const createMetadataFactory = (params: RenderingProviderParams) =>
  /**
   * Generate all the metadata necessary for rendering a boostrapped page.
   */
  async (id = 'core', includeUserProvidedConfig = true): Promise<RenderingMetadata> => {
    const basePath = params.http.basePath.get(params.request);
    const uiPlugins = await getUiPlugins(params);
    const settings = await getSettings(params, includeUserProvidedConfig);
    const vars = await getVariables(
      id,
      uiPlugins.map(({ config }) => config),
      params
    );

    return {
      strictCsp: params.http.csp.strict,
      uiPublicUrl: `${basePath}/ui`,
      bootstrapScriptUrl: `${basePath}/bundles/app/${id}/bootstrap.js`,
      i18n: i18n.translate,
      locale: i18n.getLocale(),
      darkMode: settings.user?.['theme:darkMode']?.userValue
        ? Boolean(settings.user['theme:darkMode'].userValue)
        : false,
      injectedMetadata: {
        version: params.env.packageInfo.version,
        buildNumber: params.env.packageInfo.buildNum,
        branch: params.env.packageInfo.branch,
        basePath,
        env: params.env,
        legacyMode: id !== 'core',
        i18n: {
          translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
        },
        csp: { warnLegacyBrowsers: params.http.csp.warnLegacyBrowsers },
        vars,
        uiPlugins,
        legacyMetadata: {
          app: {},
          bundleId: `app:${id}`,
          nav: params.legacyPlugins.navLinks,
          version: params.env.packageInfo.version,
          branch: params.env.packageInfo.branch,
          buildNum: params.env.packageInfo.buildNum,
          buildSha: params.env.packageInfo.buildSha,
          serverName: params.http.server.name,
          devMode: params.env.mode.dev,
          basePath,
          uiSettings: settings,
        },
      },
    };
  };
