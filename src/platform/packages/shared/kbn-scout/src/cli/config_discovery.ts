/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { SCOUT_PLAYWRIGHT_CONFIGS_PATH } from '@kbn/scout-info';
import path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { getScoutPlaywrightConfigs, DEFAULT_TEST_PATH_PATTERNS } from '../config';
import { measurePerformance } from '../common';
import { validateWithScoutCiConfig } from '../config/discovery';

const getCountByType = (configs: Map<string, any>, type: 'plugin' | 'package'): number => {
  return Array.from(configs.values()).filter((config) => config.type === type).length;
};

export const runDiscoverPlaywrightConfigs = (flagsReader: FlagsReader, log: ToolingLog) => {
  const searchPaths = flagsReader.arrayOfStrings('searchPaths')!;

  const scoutConfigs = measurePerformance(log, 'Discovering Playwright config files', () =>
    getScoutPlaywrightConfigs(searchPaths, log)
  );

  const pluginCount = getCountByType(scoutConfigs, 'plugin');
  const packageCount = getCountByType(scoutConfigs, 'package');

  const finalMessage =
    scoutConfigs.size === 0
      ? 'No Playwright config files found'
      : `Found Playwright config files in ${pluginCount} plugin(s) and ${packageCount} package(s)`;

  if (!flagsReader.boolean('save')) {
    log.info(finalMessage);

    scoutConfigs.forEach((data, itemName) => {
      log.info(`${data.group} / [${itemName}] ${data.type}:`);
      data.configs.map((file) => {
        log.info(`- ${file}`);
      });
    });
  }

  if (flagsReader.boolean('save')) {
    const runnableConfigs = validateWithScoutCiConfig(log, scoutConfigs);

    const runnablePluginCount = getCountByType(runnableConfigs, 'plugin');
    const runnablePackageCount = getCountByType(runnableConfigs, 'package');

    const dirPath = path.dirname(SCOUT_PLAYWRIGHT_CONFIGS_PATH);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
      SCOUT_PLAYWRIGHT_CONFIGS_PATH,
      JSON.stringify(Object.fromEntries(runnableConfigs), null, 2)
    );

    log.info(
      `${finalMessage}.\nSaved ${runnablePluginCount} plugin(s) and ${runnablePackageCount} package(s) to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'`
    );

    return;
  }

  if (flagsReader.boolean('validate')) {
    validateWithScoutCiConfig(log, scoutConfigs);
  }
};

/**
 * Discover Playwright configuration files with Scout tests
 */
export const discoverPlaywrightConfigsCmd: Command<void> = {
  name: 'discover-playwright-configs',
  description: `
  Discover Playwright configuration files with Scout tests.

  Common usage:
    node scripts/scout discover-playwright-configs --searchPaths <search_paths>
    node scripts/scout discover-playwright-configs --validate // validate if all items are registered in the Scout CI config
    node scripts/scout discover-playwright-configs --save // validate and save enabled items with their config files to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'
    node scripts/scout discover-playwright-configs
  `,
  flags: {
    string: ['searchPaths'],
    boolean: ['save', 'validate'],
    default: { searchPaths: DEFAULT_TEST_PATH_PATTERNS, save: false, validate: false },
  },
  run: ({ flagsReader, log }) => {
    runDiscoverPlaywrightConfigs(flagsReader, log);
  },
};
