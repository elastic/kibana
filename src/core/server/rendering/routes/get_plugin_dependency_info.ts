/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PackageInfo } from '@kbn/config';
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { UiPlugins } from '../../plugins';
import { InternalUiServiceStart } from '../../ui';

export const registerGetPluginDependencyInfoRoute = ({
  router,
  uiPlugins,
  getUiStart,
  packageInfo,
  serverBasePath,
}: {
  router: IRouter;
  uiPlugins: UiPlugins;
  getUiStart: () => InternalUiServiceStart;
  packageInfo: PackageInfo;
  serverBasePath: string;
}) => {
  router.get(
    {
      path: '/internal/core/rendering/plugin/{pluginId}/dependencies',
      validate: {
        params: schema.object({
          pluginId: schema.string(),
        }),
      },
      options: {
        authRequired: false,
      },
    },
    (ctx, req, res) => {
      const { pluginId } = req.params;

      // TODO support for plugins flagged as required / requiredFor
      // uiPlugins.public.get();

      const requiredPluginIds = getDependentPlugins(pluginId, uiPlugins);
      const regularBundlePath = `${serverBasePath}/${packageInfo.buildNum}/bundles`;
      const pluginsBundlePaths = getPluginsBundlePaths(
        requiredPluginIds,
        uiPlugins,
        regularBundlePath
      );

      const orderedPluginIds = [...uiPlugins.public].map(([id]) => id);

      pluginsBundlePaths.sort(({ pluginId: id1 }, { pluginId: id2 }) => {
        const index1 = orderedPluginIds.indexOf(id1);
        const index2 = orderedPluginIds.indexOf(id2);
        return index1 > index2 ? 1 : index2 > index1 ? -1 : 0;
      });

      return res.ok({
        body: {
          plugins: pluginsBundlePaths,
        },
      });
    }
  );
};

const getDependentPlugins = (rootPluginId: string, uiPlugins: UiPlugins) => {
  const pluginsToProcess = [rootPluginId];
  const dependencyIds: string[] = [];
  const processedPlugins = new Set<string>();

  while (pluginsToProcess.length > 0) {
    const pluginId = pluginsToProcess.pop()!;
    if (!uiPlugins.internal.get(pluginId)) {
      continue;
    }
    const plugin = uiPlugins.public.get(pluginId)!;

    const dependencies = [
      ...plugin.requiredPlugins,
      ...plugin.optionalPlugins,
      ...plugin.requiredBundles,
    ];
    for (const dependency of dependencies) {
      if (!processedPlugins.has(dependency) && !pluginsToProcess.includes(dependency)) {
        pluginsToProcess.push(dependency);
      }
    }

    dependencyIds.push(pluginId);
    processedPlugins.add(pluginId);
  }

  return dependencyIds;
};

interface PluginInfo {
  pluginId: string;
  publicPath: string;
  bundlePath: string;
}

const getPluginsBundlePaths = (
  pluginIds: string[],
  uiPlugins: UiPlugins,
  regularBundlePath: string
) => {
  const pluginBundlePaths: PluginInfo[] = [];

  for (const pluginId of pluginIds) {
    const plugin = uiPlugins.internal.get(pluginId)!;
    const { version } = plugin;
    pluginBundlePaths.push({
      pluginId,
      publicPath: `${regularBundlePath}/plugin/${pluginId}/${version}/`,
      bundlePath: `${regularBundlePath}/plugin/${pluginId}/${version}/${pluginId}.plugin.js`,
    });
  }

  return pluginBundlePaths;
};
