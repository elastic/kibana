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

export const getScoutPlaywrightConfigs = (searchPaths: string[], log: ToolingLog) => {
  const patterns = searchPaths.map((basePath) =>
    path.join(basePath, '**/ui_tests/{playwright.config.ts,parallel.playwright.config.ts}')
  );

  log.info('Searching for playwright config files in the following paths:');
  patterns.forEach((pattern) => log.info(`- ${pattern}`));
  log.info(''); // Add a newline for better readability

  const files = patterns.flatMap((pattern) => fastGlob.sync(pattern, { onlyFiles: true }));

  // Group config files by plugin
  const plugins = files.reduce((acc: Map<string, string[]>, filePath: string) => {
    const match = filePath.match(
      /(?:src\/platform\/plugins|x-pack\/.*?\/plugins)\/(?:.*?\/)?([^\/]+)\/ui_tests\//
    );
    const pluginName = match ? match[1] : null;

    if (pluginName) {
      if (!acc.has(pluginName)) {
        acc.set(pluginName, []);
      }
      acc.get(pluginName)!.push(filePath);
    } else {
      log.warning(`Unable to extract plugin name from path: ${filePath}`);
    }

    return acc;
  }, new Map<string, string[]>());

  return plugins;
};
