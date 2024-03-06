/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { PluginInfo, DependencyState, PluginStatuses } from '../types';

import { PLUGIN_LAYERS, PLUGIN_LIFECYCLES } from '../const';

/**
 * Prepares a summary of the plugin's dependencies, based on its manifest and plugin classes.
 */
export const getDependencySummary = (pluginInfo: PluginInfo, log: ToolingLog): PluginStatuses => {
  const {
    dependencies: { all, manifest, plugin },
  } = pluginInfo;

  const manifestDependencyNames = manifest.all;

  log.debug('All manifest dependencies:', manifestDependencyNames);

  const pluginDependencyNames = plugin.all;

  log.debug('All plugin dependencies:', all);

  // Combine all dependencies, removing duplicates.
  const dependencyNames = [
    ...new Set<string>([...pluginDependencyNames, ...manifestDependencyNames]),
  ];

  log.debug('All dependencies:', dependencyNames);

  const plugins: PluginStatuses = {};

  // For each dependency, add the manifest state to the summary.
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

    // For each plugin layer...
    PLUGIN_LAYERS.map((layer) => {
      // ..initialize the layer object if it doesn't exist.
      plugins[name][layer] = plugins[name][layer] || {};

      // For each plugin lifecycle...
      PLUGIN_LIFECYCLES.map((lifecycle) => {
        // ...initialize the lifecycle object if it doesn't exist.
        plugins[name][layer][lifecycle] = plugins[name][layer][lifecycle] || {};

        const pluginLifecycle = plugin[layer][lifecycle];
        const source = pluginLifecycle?.source || 'none';

        if (pluginInfo.classes[layer] === null) {
          // If the plugin class for the layer doesn't exist-- e.g. it doesn't have a `server` implementation,
          // then set the state to `no class`.
          plugins[name][layer][lifecycle] = { typeName: '', pluginState: 'no class', source };
        } else if (source === 'none') {
          // If the plugin class for the layer does exist, but the plugin doesn't implement the lifecycle,
          // then set the state to `unknown`.
          plugins[name][layer][lifecycle] = { typeName: '', pluginState: 'unknown', source };
        } else {
          // Set the state of the dependency and its type name.
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

  // Once the statuses of all of the plugins are constructed, determine the overall state of the dependency
  // relative to the plugin.
  //
  // For each dependency...
  Object.entries(plugins).forEach(([name, nextPlugin]) => {
    const { manifestState, client, server } = nextPlugin;
    const { setup, start } = client;
    const { setup: serverSetup, start: serverStart } = server;

    // ...create an array of unique states for the dependency derived from the manifest and plugin classes.
    const state = [
      ...new Set<string>([
        manifestState,
        setup.pluginState,
        start.pluginState,
        serverSetup.pluginState,
        serverStart.pluginState,
      ]),
    ];

    // If there is more than one state in the array, then the dependency is in a mismatched state, e.g.
    // the manifest states it's `required` but the impl claims it's `optional`.
    let status: DependencyState = 'mismatch';

    if (state.length === 1) {
      if (state.includes('required')) {
        status = 'required';
      } else if (state.includes('optional')) {
        status = 'optional';
      }
    }

    // Set the status of the dependency.
    plugins[name].status = status;
  });

  return plugins;
};
