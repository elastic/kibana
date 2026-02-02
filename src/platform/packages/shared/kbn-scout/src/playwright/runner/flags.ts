/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { FlagOptions, FlagsReader } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import path from 'path';
import { validateAndProcessTestFiles } from '../../common/utils';
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
    --config             Playwright config file path (required if --testFiles not provided)
    --testFiles          Comma-separated list of test file paths or test directory path (required if --config not provided)
    --headed             Run Playwright with browser head
    --testTarget         Run tests against locally started servers or Cloud deployment / MKI project
  `,
};

export async function parseTestFlags(flags: FlagsReader) {
  const options = parseServerFlags(flags);
  const configPath = flags.string('config');
  const headed = flags.boolean('headed');
  const testTarget = flags.enum('testTarget', ['local', 'cloud']) || 'local';
  const testFilesList = flags.string('testFiles');

  // Validate that either config or testFiles is provided, but not both
  if (!configPath && !testFilesList) {
    throw createFlagError(`Either '--config' or '--testFiles' flag is required`);
  }

  if (configPath && testFilesList) {
    throw createFlagError(`Cannot use both '--config' or '--testFiles' flags at the same time`);
  }

  let scoutConfigPath: string;
  const testFiles: string[] = [];

  if (testFilesList) {
    // Process testFiles and derive config path
    const { testFiles: validatedTestFiles, configPath: derivedConfigPath } =
      validateAndProcessTestFiles(testFilesList);

    testFiles.push(...validatedTestFiles);
    scoutConfigPath = derivedConfigPath;
  } else {
    // Use provided config path
    scoutConfigPath = configPath!;
  }

  const configFullPath = path.resolve(REPO_ROOT, scoutConfigPath);
  await validatePlaywrightConfig(configFullPath);

  return {
    ...options,
    configPath: scoutConfigPath,
    headed,
    testTarget,
    ...(testFiles.length > 0 && { testFiles }),
  };
}
