/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregatedResult } from '@jest/reporters';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ExecaReturnValue } from 'execa';
import execa from 'execa';
import Fs from 'fs';

export interface RunJestOptions {
  configPath: string;
  dataDir: string;
  log: ToolingLog;
  jestFlags?: string[];
  resultsPath: string;
}

/**
 * Runs Jest with a specific config file and raw flags
 */
export async function runJestWithConfig({
  configPath,
  log,
  jestFlags = [],
  resultsPath,
}: RunJestOptions): Promise<{ testResults: AggregatedResult; processResult: ExecaReturnValue }> {
  log.debug(`Running Jest with config: ${configPath}`);

  // Build Jest command arguments
  const jestArgs = ['scripts/jest', '--config', configPath, ...jestFlags];

  // Run Jest using execa
  const processResult = await execa('node', jestArgs, {
    stdio: 'inherit',
    timeout: 300000, // 5 minute timeout
    reject: false, // Don't throw on non-zero exit codes
  });

  const resultsContent = await Fs.promises.readFile(resultsPath, 'utf8');

  const testResults = JSON.parse(resultsContent) as AggregatedResult;

  return {
    testResults,
    processResult,
  };
}
