/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import {
  buildValidationCliArgs,
  describeValidationNoTargetsScope,
  formatReproductionCommand,
  hasValidationRunFlags,
  readValidationRunFlags,
  resolveValidationBaseContext,
  type ValidationBaseContext,
  VALIDATION_RUN_HELP,
  VALIDATION_RUN_STRING_FLAGS,
} from '@kbn/dev-validation-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

import { runJest } from './run';
import { runJestViaMoon, type MoonJestTaskResult } from './run_jest_via_moon';

export const JEST_LABEL = 'jest';
export const JEST_LOG_PREFIX = `[${JEST_LABEL}]`;

type JestContractTestMode = 'related' | 'affected';

interface JestConfigSelectionState {
  changedTestFiles: Set<string>;
  relatedFiles: Set<string>;
  runAllTests: boolean;
}

export interface JestChangedFileEntry {
  repoRelPath: string;
  owningConfigPath?: string;
  isConfigFile: boolean;
  isTestFile: boolean;
}

export interface JestContractRunPlan {
  configPath: string;
  mode: 'full' | 'related';
  relatedFiles?: string[];
}

export interface JestConfigResult {
  index: number;
  total: number;
  config: string;
  passed: boolean;
  testCount: number;
  failureOutput?: string;
  command: string;
}

export interface JestValidationResult {
  configCount: number;
  testCount: number;
}

export interface ExecuteJestValidationOptions {
  baseContext: ValidationBaseContext;
  log: ToolingLog;
  passthroughArgs?: string[];
  procRunner: Pick<ProcRunner, 'run'>;
  onConfigResult?: (result: JestConfigResult) => void;
}

const hasArgFlag = (args: string[], flag: string) => {
  return args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
};

const VALIDATION_FLAGS = new Set(VALIDATION_RUN_STRING_FLAGS.map((flag) => `--${flag}`));

const stripValidationArgs = (args: string[]) => {
  const passthroughArgs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [flagName] = arg.split('=');
    if (!VALIDATION_FLAGS.has(flagName)) {
      passthroughArgs.push(arg);
      continue;
    }

    if (arg === flagName) {
      index += 1;
    }
  }

  return passthroughArgs;
};

const isFullJestRun = (baseContext: ValidationBaseContext) => {
  return (
    baseContext.mode === 'contract' &&
    (baseContext.runContext.kind === 'full' || baseContext.contract.testMode === 'all')
  );
};

const createSelectionMap = () => new Map<string, JestConfigSelectionState>();

const getOrCreateSelection = (
  selections: Map<string, JestConfigSelectionState>,
  configPath: string
): JestConfigSelectionState => {
  const existing = selections.get(configPath);
  if (existing) {
    return existing;
  }

  const selection: JestConfigSelectionState = {
    changedTestFiles: new Set<string>(),
    relatedFiles: new Set<string>(),
    runAllTests: false,
  };
  selections.set(configPath, selection);
  return selection;
};

/** Builds per-config Jest run plans from changed files and the selected test mode. */
export const planJestContractRuns = ({
  entries,
  testMode,
}: {
  entries: JestChangedFileEntry[];
  testMode: JestContractTestMode;
}): JestContractRunPlan[] => {
  const selections = createSelectionMap();

  for (const entry of entries) {
    if (entry.isConfigFile) {
      getOrCreateSelection(selections, Path.resolve(REPO_ROOT, entry.repoRelPath)).runAllTests =
        true;
      continue;
    }

    if (!entry.owningConfigPath) {
      continue;
    }

    const selection = getOrCreateSelection(selections, entry.owningConfigPath);
    selection.relatedFiles.add(entry.repoRelPath);

    if (entry.isTestFile) {
      selection.changedTestFiles.add(entry.repoRelPath);
    } else if (testMode === 'affected') {
      selection.runAllTests = true;
    }
  }

  return [...selections.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([configPath, selection]): JestContractRunPlan[] => {
      if (selection.runAllTests) {
        return [{ configPath, mode: 'full' }];
      }

      const relatedFiles = [
        ...(testMode === 'related' ? selection.relatedFiles : selection.changedTestFiles),
      ].sort((left, right) => left.localeCompare(right));

      if (relatedFiles.length === 0) {
        return [];
      }

      return [
        {
          configPath,
          mode: 'related',
          relatedFiles,
        },
      ];
    });
};

const runJestAllConfigs = async ({
  procRunner,
  passthroughArgs,
}: {
  procRunner: Pick<ProcRunner, 'run'>;
  passthroughArgs: string[];
}) => {
  const args = ['scripts/jest_all', ...passthroughArgs];
  const commandForLog = `node ${args.join(' ')}`;

  try {
    await procRunner.run('jest_all', {
      cmd: process.execPath,
      args,
      cwd: REPO_ROOT,
      wait: true,
    });
  } catch {
    throw createFailError(
      `${JEST_LABEL} full run failed. Re-run directly with:\n  ${commandForLog}`
    );
  }
};

const stripAnsiCodes = (s: string) => s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

const formatMoonFailure = (task: MoonJestTaskResult): string => {
  const lines: string[] = [];

  // Group failures by file
  const byFile = new Map<string, typeof task.failures>();
  for (const f of task.failures) {
    const list = byFile.get(f.file) ?? [];
    list.push(f);
    byFile.set(f.file, list);
  }

  for (const [file, failures] of byFile) {
    const firstLine = failures[0]?.line;
    const fileRef = firstLine ? `${file}:${firstLine}` : file;
    lines.push(`FAIL ${fileRef}`);
    for (const f of failures) {
      lines.push(`  ● ${f.name}`);
      lines.push('');
      const msgLines = stripAnsiCodes(f.message).split('\n');
      let pastFirstStackFrame = false;
      for (const msgLine of msgLines) {
        const trimmedLine = msgLine.trim();
        if (trimmedLine.startsWith('at ') && pastFirstStackFrame) {
          continue;
        }
        if (trimmedLine.startsWith('at ')) {
          pastFirstStackFrame = true;
        }
        lines.push(`    ${msgLine}`);
      }
      lines.push('');
    }
  }

  const rerunCmd = task.configPath
    ? `node scripts/jest --config ${task.configPath}`
    : `node scripts/jest`;
  lines.push(`Re-run with: ${rerunCmd}`);

  return lines.join('\n');
};

/**
 * Resolves scoped Jest targets from the validation contract and executes the
 * required config runs via Moon, including downstream expansion when requested.
 */
export const executeJestValidation = async ({
  baseContext,
  log,
  passthroughArgs = [],
  procRunner,
}: ExecuteJestValidationOptions): Promise<JestValidationResult | null> => {
  if (baseContext.mode === 'direct_target') {
    throw createFailError(
      'scripts/jest only supports validation-contract execution. Remove explicit test targets and use --profile/--scope instead.'
    );
  }

  const resolvedBase =
    baseContext.runContext.kind === 'affected' ? baseContext.runContext.resolvedBase : undefined;
  const shouldRunAllConfigs = isFullJestRun(baseContext);
  const cliArgs = buildValidationCliArgs({
    contract: baseContext.contract,
    resolvedBase,
    forceFullProfile: shouldRunAllConfigs,
  });

  log.info(`Running \`${formatReproductionCommand('jest', cliArgs.logArgs)}\``);

  if (shouldRunAllConfigs) {
    log.info('Contract resolved to a full Jest run; delegating to scripts/jest_all.');
    await runJestAllConfigs({ procRunner, passthroughArgs });
    return null;
  }

  if (baseContext.runContext.kind === 'skip') {
    log.info(
      `No changed files found ${describeValidationNoTargetsScope(baseContext)}; skipping jest.`
    );
    return null;
  }

  if (baseContext.runContext.kind !== 'affected') {
    throw new Error('Unexpected Jest contract state: expected affected run context.');
  }

  const changedFiles = baseContext.runContext.changedFiles;

  if (changedFiles.length === 0) {
    log.info(
      `No changed files found ${describeValidationNoTargetsScope(baseContext)}; skipping jest.`
    );
    return null;
  }

  const { downstream } = baseContext.contract;

  log.info(`${JEST_LOG_PREFIX} running affected configs via Moon...`);

  const result = await runJestViaMoon({
    changedFiles,
    downstream,
  });

  if (result.warnings) {
    for (const warning of result.warnings) {
      log.warning(warning);
    }
  }

  if (result.taskCount === 0 && result.exitCode !== 0) {
    const excerptLines = result.failureExcerpt ?? [];
    const message = [
      `${JEST_LABEL} failed (Moon exited with code ${result.exitCode}).`,
      ...excerptLines.map((l) => `  ${l}`),
      'Re-run with: node scripts/jest --profile quick',
    ].join('\n');
    throw createFailError(message);
  }

  if (result.taskCount === 0) {
    log.info(
      `No affected Jest configs found ${describeValidationNoTargetsScope(
        baseContext
      )}; skipping jest.`
    );
    return null;
  }

  const { cachedCount } = result;
  const ranCount = result.taskCount - cachedCount;

  if (result.failed.length > 0) {
    for (const task of result.failed) {
      log.write('');
      log.error(formatMoonFailure(task));
    }

    log.write('');
    throw createFailError(
      `${JEST_LABEL} failed for ${result.failed.length} config(s) (${ranCount} ran, ${cachedCount} cached; ${result.totalTests} tests).`
    );
  }

  const parts: string[] = [];
  if (ranCount > 0) parts.push(`${ranCount} ran`);
  if (cachedCount > 0) parts.push(`${cachedCount} cached`);
  parts.push(`${result.totalTests} tests`);

  log.success(`${JEST_LOG_PREFIX} passed (${parts.join(', ')})`);
  return { configCount: result.taskCount, testCount: result.totalTests };
};

/** Runs the validation-contract-aware `scripts/jest` CLI entrypoint. */
export const runJestContract = () => {
  run(
    async ({ log, flags, flagsReader, procRunner }) => {
      const rawArgs = process.argv.slice(2);
      const hasValidationContractFlags = hasValidationRunFlags(rawArgs);
      const hasExplicitTargets =
        flags._.length > 0 ||
        hasArgFlag(rawArgs, '--config') ||
        hasArgFlag(rawArgs, '--testPathPattern') ||
        hasArgFlag(rawArgs, '--findRelatedTests') ||
        hasArgFlag(rawArgs, '--runTestsByPath');

      if (hasExplicitTargets && !hasValidationContractFlags) {
        await runJest();
        return;
      }

      if (hasExplicitTargets && hasValidationContractFlags) {
        throw createFailError(
          'scripts/jest only supports validation-contract execution. Remove explicit test targets and use --profile/--scope instead.'
        );
      }

      const passthroughArgs = stripValidationArgs(rawArgs);
      const validationFlags = readValidationRunFlags(flagsReader);
      const baseContext = await resolveValidationBaseContext({
        flags: validationFlags,
        runnerDescription: 'jest',
        onWarning: (message) => log.warning(message),
      });

      await executeJestValidation({
        baseContext,
        log,
        passthroughArgs,
        procRunner,
      });
    },
    {
      description: `
      Run Jest using the shared validation contract to select scoped targets.

      Examples:
        # quick local profile
        node scripts/jest --profile quick

        # agent local profile
        node scripts/jest --profile agent

        # PR-equivalent branch scope
        node scripts/jest --profile pr

        # full repository run
        node scripts/jest --profile full
      `,
      flags: {
        string: [...VALIDATION_RUN_STRING_FLAGS],
        allowUnexpected: true,
        help: [...VALIDATION_RUN_HELP],
      },
    }
  );
};
