/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastGlob from 'fast-glob';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';

export const DEFAULT_TEST_PATH_PATTERNS = ['src/platform/plugins', 'x-pack/**/plugins'];

interface PluginScoutConfig {
  group: string;
  pluginPath: string;
  usesParallelWorkers: boolean;
  configs: string[];
}

export const getScoutPlaywrightConfigs = (searchPaths: string[], log: ToolingLog) => {
  const patterns = searchPaths.map((basePath) =>
    path.join(basePath, '**/ui_tests/{playwright.config.ts,parallel.playwright.config.ts}')
  );

  log.info('Searching for Playwright config files in the following paths:');
  patterns.forEach((pattern) => log.info(`- ${pattern}`));
  log.info(''); // Add a newline for better readability

  const files = patterns.flatMap((pattern) => fastGlob.sync(pattern, { onlyFiles: true }));

  const typeMappings: Record<string, string> = {
    'x-pack/solutions/security': 'security',
    'x-pack/solutions/search': 'search',
    'x-pack/solutions/observability': 'observability',
    'x-pack/platform/plugins': 'platform',
    'src/platform/plugins': 'platform',
  };

  const matchPluginPath = (filePath: string): { pluginPath: string; pluginName: string } | null => {
    const regexes = [
      /(x-pack\/platform\/plugins\/(?:private|shared|[^\/]+)\/([^\/]+))\/ui_tests\//,
      /(x-pack\/solutions\/[^\/]+\/plugins\/([^\/]+))\/ui_tests\//,
      /(src\/platform\/plugins\/(?:private|shared)?\/?([^\/]+))\/ui_tests\//,
    ];

    for (const regex of regexes) {
      const match = filePath.match(regex);
      if (match) {
        return { pluginPath: match[1], pluginName: match[2] };
      }
    }
    return null;
  };

  const pluginsWithConfigs = new Map<string, PluginScoutConfig>();

  files.forEach((filePath) => {
    const matchResult = matchPluginPath(filePath);
    if (!matchResult) {
      log.warning(`Unable to extract plugin name from path: ${filePath}`);
      return;
    }

    const { pluginPath, pluginName } = matchResult;
    const group =
      Object.entries(typeMappings).find(([key]) => filePath.includes(key))?.[1] || 'unknown';

    if (!pluginsWithConfigs.has(pluginName)) {
      pluginsWithConfigs.set(pluginName, {
        group,
        pluginPath,
        configs: [],
        usesParallelWorkers: false,
      });
    }

    const pluginData = pluginsWithConfigs.get(pluginName)!;
    if (!pluginData.configs.includes(filePath)) {
      pluginData.configs.push(filePath);
      if (filePath.endsWith('parallel.playwright.config.ts')) {
        pluginData.usesParallelWorkers = true;
      }
    }
  });

  return pluginsWithConfigs;
};
