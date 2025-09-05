/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import path from 'path';
import fs from 'fs';
import type { FlagOptions, FlagsReader } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { SERVER_FLAG_OPTIONS, parseServerFlags } from '../../servers';
import type { CliSupportedServerModes } from '../../types';
import { validatePlaywrightConfig } from './config_validator';

export interface RunTestsOptions {
  configPath: string;
  headed: boolean;
  mode: CliSupportedServerModes;
  testTarget: 'local' | 'cloud';
  testFiles?: string[];
  esFrom: 'serverless' | 'source' | 'snapshot' | undefined;
  installDir: string | undefined;
  logsDir: string | undefined;
}

export const TEST_FLAG_OPTIONS: FlagOptions = {
  ...SERVER_FLAG_OPTIONS,
  boolean: [...(SERVER_FLAG_OPTIONS.boolean || []), 'headed'],
  string: [...(SERVER_FLAG_OPTIONS.string || []), 'config', 'testTarget', 'testFiles'],
  default: { headed: false, testTarget: 'local' },
  help: `${SERVER_FLAG_OPTIONS.help}
    --config             Playwright config file path
    --headed             Run Playwright with browser head
    --testTarget         Run tests agaist locally started servers or Cloud deployment / MKI project
    --testFiles          Comma-separated list of test file paths to run
  `,
};

export async function parseTestFlags(flags: FlagsReader) {
  const options = parseServerFlags(flags);
  const configPath = flags.string('config');
  const headed = flags.boolean('headed');
  const testTarget = flags.enum('testTarget', ['local', 'cloud']) || 'local';
  const testFilesList = flags.string('testFiles');

  if (!configPath) {
    throw createFlagError(`Path to playwright config is required: --config <file path>`);
  }

  const configFullPath = path.resolve(REPO_ROOT, configPath);
  await validatePlaywrightConfig(configFullPath);

  const testFiles: string[] = [];

  if (testFilesList) {
    const rawPaths = testFilesList
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    for (const testPath of rawPaths) {
      const fullTestFile = path.resolve(REPO_ROOT, testPath);

      // Check if the path is within REPO_ROOT
      if (!fullTestFile.startsWith(REPO_ROOT)) {
        throw createFlagError(`Test file must be within the repository: ${testPath}`);
      }

      // Check if the file exists
      if (!fs.existsSync(fullTestFile)) {
        throw createFlagError(`Test file does not exist: ${testPath}`);
      }

      // Check if it's a file (not a directory)
      const stat = fs.statSync(fullTestFile);
      if (!stat.isFile()) {
        throw createFlagError(`Test file must be a file, not a directory: ${testPath}`);
      }

      testFiles.push(testPath);
    }
  }

  return {
    ...options,
    configPath,
    headed,
    testTarget,
    ...(testFiles.length > 0 && { testFiles }),
  };
}
