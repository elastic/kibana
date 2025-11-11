/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { SCOUT_OUTPUT_ROOT } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path from 'path';
import { measurePerformance } from '../common';
import { DEFAULT_TEST_PATH_PATTERNS, getScoutPlaywrightConfigs } from '../config';
import { filterConfigsWithTests } from './test_filtering';

const SCOUT_CLOUD_RUN_CONFIG_PATH = path.resolve(SCOUT_OUTPUT_ROOT, 'scout_cloud_run_config.json');

export const runFilterCloudPlaywrightConfigs = async (
  flagsReader: FlagsReader,
  log: ToolingLog
) => {
  const searchPaths = flagsReader.arrayOfStrings('searchPaths')!;

  const scoutConfigs = measurePerformance(log, 'Discovering Playwright config files', () =>
    getScoutPlaywrightConfigs(searchPaths, log)
  );

  // Filter configs with tests matching cloud tags
  const filteredConfigs = filterConfigsWithTests(scoutConfigs, log);

  // Save the filtered configs to JSON file
  const dirPath = path.dirname(SCOUT_CLOUD_RUN_CONFIG_PATH);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(SCOUT_CLOUD_RUN_CONFIG_PATH, JSON.stringify(filteredConfigs, null, 2));

  log.info(`Saved filtered cloud configs to '${SCOUT_CLOUD_RUN_CONFIG_PATH}'`);
};

/**
 * Filter Playwright configuration files for Cloud testing
 */
export const filterCloudPlaywrightConfigsCmd: Command<void> = {
  name: 'filter-cloud-playwright-configs',
  description: `
  Filter Playwright configuration files that have tests matching cloud tags (ess, svlSecurity, svlOblt, svlSearch).
  This command is used to prepare a list of configs for Cloud testing.

  Common usage:
    node scripts/scout filter-cloud-playwright-configs --searchPaths <search_paths>
    node scripts/scout filter-cloud-playwright-configs
  `,
  flags: {
    string: ['searchPaths'],
    default: { searchPaths: DEFAULT_TEST_PATH_PATTERNS },
  },
  run: ({ flagsReader, log }) => {
    runFilterCloudPlaywrightConfigs(flagsReader, log);
  },
};
