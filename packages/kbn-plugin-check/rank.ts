/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MultiBar, Presets } from 'cli-progress';

import { ToolingLog } from '@kbn/tooling-log';

import { getAllPlugins } from './lib';

interface Dependencies {
  required: readonly string[];
  optional: readonly string[];
  bundles?: readonly string[];
}

const getSpaces = (size: number, count: number) => {
  const length = count > 9 && count < 100 ? 2 : count < 10 ? 1 : 3;
  return ' '.repeat(size - length);
};

export const rankDependencies = (log: ToolingLog) => {
  const plugins = getAllPlugins(log);

  const pluginMap = new Map<string, Dependencies>();
  const pluginRequired = new Map<string, number>();
  const pluginOptional = new Map<string, number>();
  const pluginBundles = new Map<string, number>();
  let minWidth = 0;

  plugins.forEach((plugin) => {
    pluginMap.set(plugin.manifest.id, {
      required: plugin.manifest.requiredPlugins || [],
      optional: plugin.manifest.optionalPlugins || [],
      bundles: plugin.manifest.requiredBundles || [],
    });

    if (plugin.manifest.id.length > minWidth) {
      minWidth = plugin.manifest.id.length;
    }
  });

  pluginMap.forEach((dependencies) => {
    dependencies.required.forEach((required) => {
      pluginRequired.set(required, (pluginRequired.get(required) || 0) + 1);
    });

    dependencies.optional.forEach((optional) => {
      pluginOptional.set(optional, (pluginOptional.get(optional) || 0) + 1);
    });

    dependencies.bundles?.forEach((bundle) => {
      pluginBundles.set(bundle, (pluginBundles.get(bundle) || 0) + 1);
    });
  });

  const sorted = [...pluginMap.entries()].sort((a, b) => {
    const aRequired = pluginRequired.get(a[0]) || 0;
    const aOptional = pluginOptional.get(a[0]) || 0;
    const aBundles = pluginBundles.get(a[0]) || 0;
    const aTotal = aRequired + aOptional + aBundles;

    const bRequired = pluginRequired.get(b[0]) || 0;
    const bOptional = pluginOptional.get(b[0]) || 0;
    const bBundles = pluginBundles.get(b[0]) || 0;
    const bTotal = bRequired + bOptional + bBundles;

    return bTotal - aTotal;
  });

  log.debug(`Ranking ${sorted.length} plugins.`);

  // sorted.forEach((plugin) => {
  //   log.info(`${plugin[0]}: ${plugin[1]}/${pluginOptional.get(plugin[0]) || 0}`);
  // });

  const multiBar = new MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: ' {bar} | {plugin} | {usage} | {info}',
    },
    Presets.shades_grey
  );

  multiBar.create(sorted.length, sorted.length, {
    plugin: `${sorted.length} plugins${' '.repeat(minWidth - 11)}`,
    usage: 'total',
    info: 'req opt bun',
  });

  sorted.forEach(([plugin]) => {
    const total = sorted.length;
    const optional = pluginOptional.get(plugin) || 0;
    const required = pluginRequired.get(plugin) || 0;
    const bundles = pluginBundles.get(plugin) || 0;
    const usage = optional + required + bundles;

    multiBar.create(total, required + optional + bundles, {
      plugin: `${plugin}${' '.repeat(minWidth - plugin.length)}`,
      info: `${required}${getSpaces(4, required)}${optional}${getSpaces(
        4,
        optional
      )}${bundles}${getSpaces(4, bundles)}`,
      usage: `${usage}${getSpaces(5, usage)}`,
    });
  });

  multiBar.stop();

  return sorted;
};
