/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'node:child_process';
import path from 'path';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { generateTestRunId } from '@kbn/scout-reporting';
import {
  ensureVisualRegressionRunId,
  SCOUT_VISUAL_REGRESSION_ENABLED_ENV,
  SCOUT_VISUAL_REGRESSION_UPDATE_BASELINES_ENV,
} from '../playwright/runtime/environment';
import type { ParsedVisualRunTestsArgs } from './arg_parsing';
import type { VisualRunSelection } from './visual_test_discovery';

export const buildScoutArgsForVisualRun = (
  parsedArgs: ParsedVisualRunTestsArgs,
  visualTestFiles: string[]
): string[] => [...parsedArgs.forwardedArgs, '--testFiles', visualTestFiles.join(',')];

const createVisualRunEnvironment = (
  parsedArgs: ParsedVisualRunTestsArgs
): Record<string, string> => {
  const runId = ensureVisualRegressionRunId(generateTestRunId);

  return {
    TEST_RUN_ID: runId,
    [SCOUT_VISUAL_REGRESSION_ENABLED_ENV]: 'true',
    [SCOUT_VISUAL_REGRESSION_UPDATE_BASELINES_ENV]: String(parsedArgs.updateBaselines),
  };
};

const runScoutCommand = async (args: string[], env: Record<string, string>): Promise<number> => {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(REPO_ROOT, 'scripts/scout'), 'run-tests', ...args],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ...env,
        },
        stdio: 'inherit',
      }
    );

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (signal) {
        reject(createFailError(`Scout run was interrupted by signal '${signal}'`));
        return;
      }

      resolve(code ?? 1);
    });
  });
};

export const executeVisualRunSelection = async (
  parsedArgs: ParsedVisualRunTestsArgs,
  selection: VisualRunSelection
) => {
  process.stdout.write(`scout_vrt: ${selection.configPath}\n`);

  const exitCode = await runScoutCommand(
    buildScoutArgsForVisualRun(parsedArgs, selection.visualTestFiles),
    createVisualRunEnvironment(parsedArgs)
  );

  if (exitCode === 2) {
    throw createFailError(
      `No matching visual tests were found for '${selection.configPath}' and the requested target`,
      {
        exitCode: 2,
      }
    );
  }

  if (exitCode !== 0) {
    throw createFailError(`Visual regression run failed for '${selection.configPath}'`, {
      exitCode,
    });
  }
};
