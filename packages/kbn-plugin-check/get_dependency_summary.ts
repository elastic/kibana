/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { PluginInfo, DependencyState, PluginStatuses } from './types';

import { PLUGIN_LAYERS, PLUGIN_LIFECYCLES } from './const';

export const getDependencySummary = (pluginInfo: PluginInfo, log: ToolingLog): PluginStatuses => {
  const {
    dependencies: { all, manifest, plugin },
  } = pluginInfo;

  const manifestDependencyNames = manifest.all;

  log.debug('All manifest dependencies:', manifestDependencyNames);

  const pluginDependencyNames = plugin.all;

  log.debug('All plugin dependencies:', all);

  const dependencyNames = [
    ...new Set<string>([...pluginDependencyNames, ...manifestDependencyNames]),
  ];

  log.debug('All dependencies:', dependencyNames);

  const plugins: PluginStatuses = {};

  dependencyNames.forEach((name) => {
    plugins[name] = plugins[name] || {
      manifestState: manifest.required.includes(name)
        ? 'required'
        : manifest.optional.includes(name)
        ? 'optional'
        : manifest.bundle.includes(name)
        ? 'bundle'
        : 'missing',
    };

    PLUGIN_LAYERS.map((layer) => {
      plugins[name][layer] = plugins[name][layer] || {};

      PLUGIN_LIFECYCLES.map((lifecycle) => {
        plugins[name][layer][lifecycle] = plugins[name][layer][lifecycle] || {};
        const pluginLifecycle = plugin[layer][lifecycle];

        const source = pluginLifecycle?.source || 'none';

        if (pluginInfo.classes[layer] === null) {
          plugins[name][layer][lifecycle] = { typeName: '', pluginState: 'no class', source };
        } else if (source === 'none') {
          plugins[name][layer][lifecycle] = { typeName: '', pluginState: 'unknown', source };
        } else {
          const typeName = pluginLifecycle?.typeName || `${lifecycle}Type`;
          const pluginState = pluginLifecycle?.required.includes(name)
            ? 'required'
            : pluginLifecycle?.optional.includes(name)
            ? 'optional'
            : 'missing';
          plugins[name][layer][lifecycle] = { typeName, pluginState, source };
        }
      });
    });
  });

  Object.entries(plugins).forEach(([name, nextPlugin]) => {
    const { manifestState, client, server } = nextPlugin;
    const { setup, start } = client;
    const { setup: serverSetup, start: serverStart } = server;

    const state = [
      ...new Set([
        manifestState,
        setup.pluginState,
        start.pluginState,
        serverSetup.pluginState,
        serverStart.pluginState,
      ]),
    ];

    let status: DependencyState = 'mismatch';

    if (state.length === 1) {
      if (state.includes('required')) {
        status = 'required';
      } else if (state.includes('optional')) {
        status = 'optional';
      }
    }

    plugins[name].status = status;
  });

  return plugins;
};
