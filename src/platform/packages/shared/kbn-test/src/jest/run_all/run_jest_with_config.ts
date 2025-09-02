/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ExecaReturnValue } from 'execa';
import execa from 'execa';
import Fs from 'fs';
import type { SlimAggregatedResult } from './types';

export interface RunJestOptions {
  configPath: string;
  dataDir: string;
  log: ToolingLog;
  jestFlags?: string[];
  resultsPath: string;
}

/**
 * Read and parse a JSON file with simple retry/backoff to account for delayed writes
 * from the Jest reporter. Retries on missing file, empty content, or JSON parse errors.
 */
async function readJsonFileWithRetries<T>(
  filePath: string,
  {
    attempts = 30,
    delayMs = 200,
    log,
  }: {
    attempts?: number;
    delayMs?: number;
    log?: ToolingLog;
  }
): Promise<T> {
  let lastError: unknown;

  // Small helper to pause between attempts
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let i = 1; i <= attempts; i++) {
    try {
      // Ensure file exists and has non-zero size before reading
      const stats = await Fs.promises.stat(filePath);
      if (!stats.isFile() || stats.size === 0) {
        throw new Error('File not ready');
      }

      // Read and parse
      const raw = await Fs.promises.readFile(filePath, 'utf8');
      if (!raw || raw.trim().length === 0) {
        throw new Error('Empty content');
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      lastError = error;
      if (i < attempts) {
        if (log) {
          log.debug(
            `Waiting for results file (${i}/${attempts}) at ${filePath}...${
              error instanceof Error ? ` (${error.message})` : ''
            }`
          );
        }
        await wait(delayMs);
        continue;
      }
      break;
    }
  }

  const message =
    lastError instanceof Error
      ? `Failed to read JSON results from ${filePath}: ${lastError.message}`
      : `Failed to read JSON results from ${filePath}`;
  throw new Error(message);
}

/**
 * Runs Jest with a specific config file and raw flags
 */
export async function runJestWithConfig({
  configPath,
  log,
  jestFlags = [],
  resultsPath,
}: RunJestOptions): Promise<{
  testResults: SlimAggregatedResult;
  processResult: ExecaReturnValue;
}> {
  log.debug(`Running Jest with config: ${configPath}`);

  // Build Jest command arguments
  const jestArgs = [
    'scripts/jest',
    '--config',
    configPath,
    '--outputFile',
    resultsPath,
    ...jestFlags,
  ];

  // Run Jest using execa; rely on Jest's own timeouts (no global/idle timeout here)
  const processResult = await execa('node', jestArgs, {
    stdio: 'inherit',
    reject: false, // Don't throw on non-zero exit codes
  });

  // Read the reporter output with retries to avoid races on slow filesystems
  const testResults = await readJsonFileWithRetries<SlimAggregatedResult>(resultsPath, {
    attempts: 30,
    delayMs: 200,
    log,
  });

  return {
    testResults,
    processResult,
  };
}
