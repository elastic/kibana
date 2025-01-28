/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Command } from '@kbn/dev-cli-runner';

// import { startServers, parseServerFlags, SERVER_FLAG_OPTIONS } from '../servers';
import { getScoutPlaywrightConfigs } from '../config';

export const DEFAULT_TEST_PATH_PATTERNS = ['src/platform/plugins', 'x-pack/**/plugins'];

/**
 * Start servers
 */
export const discoverTests: Command<void> = {
  name: 'discover-tests',
  description: 'Discover Playwright configuration files with Scout tests',
  flags: {
    string: ['searchPaths'],
    default: { searchPaths: DEFAULT_TEST_PATH_PATTERNS },
  },
  run: ({ flagsReader, log }) => {
    const searchPaths = flagsReader.arrayOfStrings('searchPaths')!;

    const plugins = getScoutPlaywrightConfigs(searchPaths, log);
    plugins.forEach((files, plugin) => {
      log.info(`[${plugin}] plugin:`);
      files.forEach((file) => {
        log.info(`- ${file}`);
      });
    });
  },
};
