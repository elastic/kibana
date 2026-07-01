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
import type { ScoutTestTarget } from '@kbn/scout-info';
import { validateAndProcessTestFiles } from '../../common/utils';
import { SERVER_FLAG_OPTIONS, parseServerFlags } from '../../servers';
import { validatePlaywrightConfig } from './config_validator';

export interface RunTestsOptions {
  testTarget: ScoutTestTarget;
  configPath: string;
  headed: boolean;
  ui: boolean;
  uiHost: string | undefined;
  uiPort: number | undefined;
  repeatEach: number | undefined;
  testFiles?: string[];
  esFrom: 'serverless' | 'source' | 'snapshot' | undefined;
  installDir: string | undefined;
  logsDir: string | undefined;
}

export const TEST_FLAG_OPTIONS: FlagOptions = {
  ...SERVER_FLAG_OPTIONS,
  boolean: [...(SERVER_FLAG_OPTIONS.boolean || []), 'headed', 'ui'],
  string: [
    ...(SERVER_FLAG_OPTIONS.string || []),
    'config',
    'testFiles',
    'repeatEach',
    'uiHost',
    'uiPort',
  ],
  default: { ...SERVER_FLAG_OPTIONS.default, headed: false, ui: false },
  help: `
    ${SERVER_FLAG_OPTIONS.help}
    --config            Playwright config file path (required if --testFiles not provided)
    --testFiles         Comma-separated list of test file paths or test directory path (required if --config not provided)
    --headed            Run Playwright with browser head
    --ui                Run Playwright in interactive UI mode. Servers are started first and kept running until the UI is closed
    --uiHost            Host to serve the Playwright UI on (requires --ui, e.g. --uiHost 0.0.0.0 for remote access)
    --uiPort            Port to serve the Playwright UI on (requires --ui)
    --repeatEach        Run each test N times for local flakiness validation (e.g. --repeatEach 5)
  `,
};

export async function parseTestFlags(flags: FlagsReader) {
  const serverOptions = parseServerFlags(flags);

  const configPath = flags.string('config');
  const testFilesList = flags.string('testFiles');

  // Validate that either config or testFiles is provided, but not both
  if (!configPath && !testFilesList) {
    throw createFlagError(`Either '--config' or '--testFiles' flag is required`);
  }

  if (configPath && testFilesList) {
    throw createFlagError(`Cannot use both '--config' or '--testFiles' flags at the same time`);
  }

  const headed = flags.boolean('headed');
  const ui = flags.boolean('ui');
  const uiHost = flags.string('uiHost');
  const uiPort = flags.number('uiPort');
  const repeatEach = flags.number('repeatEach');

  if (repeatEach !== undefined && (repeatEach < 1 || !Number.isInteger(repeatEach))) {
    throw createFlagError(`'--repeatEach' must be a positive integer, got '${repeatEach}'`);
  }

  if (ui && headed) {
    throw createFlagError(
      `'--headed' cannot be combined with '--ui': UI mode manages its own browser`
    );
  }

  if (ui && repeatEach !== undefined) {
    throw createFlagError(
      `'--repeatEach' cannot be combined with '--ui': UI mode is interactive, not a batch run`
    );
  }

  if (!ui && (uiHost !== undefined || uiPort !== undefined)) {
    throw createFlagError(`'--uiHost' and '--uiPort' can only be used together with '--ui'`);
  }

  if (uiPort !== undefined && (!Number.isInteger(uiPort) || uiPort < 0 || uiPort > 65535)) {
    throw createFlagError(`'--uiPort' must be an integer between 0 and 65535, got '${uiPort}'`);
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
    ...serverOptions,
    configPath: scoutConfigPath,
    headed,
    ui,
    uiHost,
    uiPort,
    repeatEach,
    ...(testFiles.length > 0 && { testFiles }),
  };
}
