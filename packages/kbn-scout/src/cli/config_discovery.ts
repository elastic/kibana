/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Command } from '@kbn/dev-cli-runner';
import { getScoutPlaywrightConfigs, DEFAULT_TEST_PATH_PATTERNS } from '../config';
import { measurePerformance } from '../common';

/**
 * Discover Playwright configuration files with Scout tests
 */
export const discoverPlaywrightConfigs: Command<void> = {
  name: 'discover-playwright-configs',
  description: `
  Discover Playwright configuration files with Scout tests.

  Common usage:
    node scripts/scout discover-playwright-configs --searchPaths <search_paths>
    node scripts/scout discover-playwright-configs
  `,
  flags: {
    string: ['searchPaths'],
    default: { searchPaths: DEFAULT_TEST_PATH_PATTERNS },
  },
  run: ({ flagsReader, log }) => {
    const searchPaths = flagsReader.arrayOfStrings('searchPaths')!;

    const plugins = measurePerformance(log, 'Discovering playwright config files', () => {
      return getScoutPlaywrightConfigs(searchPaths, log);
    });

    const finalMessage =
      plugins.size === 0
        ? 'No playwright config files found'
        : `Found playwright config files in '${plugins.size}' plugins`;

    log.info(finalMessage);

    plugins.forEach((files, plugin) => {
      log.info(`[${plugin}] plugin:`);
      files.forEach((file) => {
        log.info(`- ${file}`);
      });
    });
  },
};
