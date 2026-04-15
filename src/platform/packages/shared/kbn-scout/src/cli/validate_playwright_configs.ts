/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { resolve } from 'path';
import { createFailError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { SCOUT_PLAYWRIGHT_CONFIGS_PATH } from '@kbn/scout-info';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { execPromise } from '../playwright/utils';
import type { ModuleDiscoveryInfo } from '../tests_discovery/types';

const getUniqueConfigPaths = (modules: ModuleDiscoveryInfo[]): string[] => {
  const paths = new Set<string>();
  for (const module of modules) {
    for (const config of module.configs) {
      paths.add(config.path);
    }
  }
  return Array.from(paths);
};

interface ValidationResult {
  configPath: string;
  status: 'passed' | 'no_tests' | 'error';
  durationMs: number;
  message?: string;
}

const validateConfig = async (configPath: string, pwBinPath: string): Promise<ValidationResult> => {
  const cmd = [
    'SCOUT_REPORTER_ENABLED=false',
    pwBinPath,
    'test',
    '--list',
    `--config=${configPath}`,
    '--project=local',
  ].join(' ');

  const start = Date.now();

  try {
    await execPromise(cmd);
    return { configPath, status: 'passed', durationMs: Date.now() - start };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMessage = (err as Error).message || String(err);

    if (errorMessage.includes('No tests found')) {
      return { configPath, status: 'no_tests', durationMs };
    }

    return { configPath, status: 'error', durationMs, message: errorMessage };
  }
};

export const runValidatePlaywrightConfigs = async (
  concurrencyLimit: number,
  log: ToolingLog
): Promise<void> => {
  if (!fs.existsSync(SCOUT_PLAYWRIGHT_CONFIGS_PATH)) {
    throw createFailError(
      `Scout discovery JSON not found at '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'. ` +
        `Run 'node scripts/scout discover-playwright-configs --save' first.`
    );
  }

  const modules: ModuleDiscoveryInfo[] = JSON.parse(
    fs.readFileSync(SCOUT_PLAYWRIGHT_CONFIGS_PATH, 'utf-8')
  );

  const configPaths = getUniqueConfigPaths(modules);

  if (configPaths.length === 0) {
    log.info('No Playwright configs to validate');
    return;
  }

  log.info(
    `Validating ${configPaths.length} Playwright config(s) with live 'playwright test --list' (concurrency: ${concurrencyLimit})`
  );

  const totalStart = Date.now();
  const pwBinPath = resolve(REPO_ROOT, './node_modules/.bin/playwright');
  const results: ValidationResult[] = [];
  const ongoing = new Set<Promise<void>>();
  let completed = 0;

  for (const configPath of configPaths) {
    if (ongoing.size >= concurrencyLimit) {
      await Promise.race(ongoing);
    }

    const task = validateConfig(configPath, pwBinPath)
      .then((result) => {
        results.push(result);
        completed++;
        const duration = (result.durationMs / 1000).toFixed(1);
        const statusLabel =
          result.status === 'passed' ? 'OK' : result.status === 'no_tests' ? 'NO TESTS' : 'ERROR';
        log.info(
          `  [${completed}/${configPaths.length}] ${statusLabel} (${duration}s): ${configPath}`
        );
      })
      .finally(() => {
        ongoing.delete(task);
      });

    ongoing.add(task);
  }

  await Promise.all(ongoing);

  const totalDuration = ((Date.now() - totalStart) / 1000).toFixed(1);
  const passed = results.filter((r) => r.status === 'passed');
  const noTests = results.filter((r) => r.status === 'no_tests');
  const errors = results.filter((r) => r.status === 'error');

  log.info(
    `Validation complete in ${totalDuration}s: ${passed.length} passed, ${noTests.length} no tests, ${errors.length} errors`
  );

  if (errors.length > 0) {
    for (const { configPath, message } of errors) {
      log.error(`Error validating [${configPath}]: ${message}`);
    }
  }

  if (noTests.length > 0) {
    const listing = noTests.map((r) => `  - ${r.configPath}`).join('\n');
    throw createFailError(
      `The following Playwright config(s) reported 0 test files:\n` +
        `${listing}\n\n` +
        `This usually means a build artifact is missing or a file loader (e.g. .peggy) crashed silently. ` +
        `Run 'npx playwright test --list --config <config>' to see Playwright errors for a specific config.`
    );
  }
};

export const validatePlaywrightConfigsCmd: Command<void> = {
  name: 'validate-playwright-configs',
  description: `
  Validate that all discovered Playwright configs have at least one test file.

  Reads the saved discovery JSON and runs 'playwright test --list' for each config.
  Fails if any config reports zero tests.

  Options:
    --concurrencyLimit <n>  Max concurrent Playwright processes (default: 5)

  Common usage:
    node scripts/scout validate-playwright-configs
  `,
  flags: {
    string: ['concurrencyLimit'],
    default: { concurrencyLimit: '5' },
  },
  run: async ({ flagsReader, log }) => {
    const concurrencyLimit = flagsReader.requiredNumber('concurrencyLimit');
    await runValidatePlaywrightConfigs(concurrencyLimit, log);
  },
};
