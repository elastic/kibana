/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import * as Fsp from 'fs/promises';
import Os from 'os';
import Path from 'path';

import { makeRe } from 'minimatch';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { ProcRunner } from '@kbn/dev-proc-runner';
import {
  buildValidationCliArgs,
  describeValidationNoTargetsScope,
  formatReproductionCommand,
  hasValidationRunFlags,
  readValidationRunFlags,
  resolveValidationAffectedProjects,
  resolveValidationBaseContext,
  type ValidationBaseContext,
  VALIDATION_RUN_HELP,
  VALIDATION_RUN_STRING_FLAGS,
} from '@kbn/dev-validation-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog, type Message, type Writer } from '@kbn/tooling-log';

import { testMatch } from '../../jest-preset';
import { findConfigInDirectoryTree, runJest } from './run';

export const JEST_LABEL = 'jest';
export const JEST_LOG_PREFIX = `[${JEST_LABEL}]`;
const JEST_CONFIG_NAMES = [
  'jest.config.dev.js',
  'jest.config.js',
  'jest.config.cjs',
  'jest.config.mjs',
  'jest.config.ts',
  'jest.config.json',
] as const;
const testMatchers = (testMatch as string[]).flatMap((pattern) => {
  const re = makeRe(pattern);
  return re ? [re] : [];
});

type ProcRunnerLike = Pick<ProcRunner, 'run'>;
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
  procRunner: ProcRunnerLike;
  onConfigResult?: (result: JestConfigResult) => void;
}

export interface ParsedJestRunOutput {
  excerpt: string[];
  failedTestFiles: string[];
  snapshots?: string;
  suites?: string;
  tests?: string;
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

const createProcLogFilter = (writer: Writer): Writer => ({
  write(message: Message) {
    if (message.source === 'ProcRunner') {
      return false;
    }

    return writer.write(message);
  },
});

const createQuietProcRunner = (log: ToolingLog) => {
  const quietLog = new ToolingLog();
  quietLog.setWriters(log.getWriters().map(createProcLogFilter));
  return new ProcRunner(quietLog);
};

const createJestOutputPath = (configRepoRel: string) =>
  Path.join(
    Os.tmpdir(),
    `kbn-jest-${configRepoRel.replace(/[\\/]/g, '_')}-${process.pid}-${Date.now()}.log`
  );

const wait = async (durationMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};

const findSummaryLine = (lines: string[], prefix: string) =>
  lines.find((line) => line.startsWith(`${prefix}:`));

/** Parses Jest stdout/stderr into a compact summary for logging and failures. */
export const parseJestRunOutput = (output: string): ParsedJestRunOutput => {
  const lines = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    excerpt: lines.filter((line) => !line.startsWith('info yarn jest')).slice(-8),
    failedTestFiles: lines
      .filter((line) => line.startsWith('FAIL '))
      .map((line) => line.slice('FAIL '.length).trim()),
    snapshots: findSummaryLine(lines, 'Snapshots'),
    suites: findSummaryLine(lines, 'Test Suites'),
    tests: findSummaryLine(lines, 'Tests'),
  };
};

/**
 * Reads Jest output from a log file, retrying until two consecutive reads
 * return identical content. This is a heuristic to wait for the ProcRunner
 * to finish flushing — there is no explicit "write complete" signal.
 */
const readParsedJestRunOutput = async (outputPath: string) => {
  let previousOutput = '';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const output = await Fsp.readFile(outputPath, 'utf8');
      if (output && output === previousOutput) {
        return parseJestRunOutput(output);
      }

      previousOutput = output;
    } catch {
      previousOutput = '';
    }

    await wait(50);
  }

  return parseJestRunOutput(previousOutput);
};

const formatSummaryValue = (summaryLine: string | undefined, label: string) => {
  if (!summaryLine) {
    return undefined;
  }

  return `${label} ${summaryLine.replace(/^[^:]+:\s*/u, '')}`;
};

const formatJestRunSummary = (parsedOutput: ParsedJestRunOutput) =>
  [
    formatSummaryValue(parsedOutput.suites, 'suites'),
    formatSummaryValue(parsedOutput.tests, 'tests'),
    formatSummaryValue(parsedOutput.snapshots, 'snapshots'),
  ]
    .filter((value): value is string => value !== undefined)
    .join('; ');

const extractTestCount = (parsedOutput: ParsedJestRunOutput): number => {
  const match = parsedOutput.tests?.match(/(\d+) total/);
  return match ? parseInt(match[1], 10) : 0;
};

const buildJestFailureMessage = ({
  commandForLog,
  configRepoRel,
  parsedOutput,
}: {
  commandForLog: string;
  configRepoRel: string;
  parsedOutput: ParsedJestRunOutput;
}) => {
  const lines = [`${JEST_LABEL} failed for ${configRepoRel}.`];
  const summary = formatJestRunSummary(parsedOutput);

  if (summary) {
    lines.push(`Summary: ${summary}`);
  }

  if (parsedOutput.failedTestFiles.length > 0) {
    lines.push('Failed test file(s):');
    for (const failedTestFile of parsedOutput.failedTestFiles.slice(0, 5)) {
      lines.push(`  ${failedTestFile}`);
    }

    if (parsedOutput.failedTestFiles.length > 5) {
      lines.push(`  ... and ${parsedOutput.failedTestFiles.length - 5} more`);
    }
  }

  if (!summary && parsedOutput.excerpt.length > 0) {
    lines.push('Error excerpt:');
    for (const line of parsedOutput.excerpt) {
      lines.push(`  ${line}`);
    }
  }

  lines.push('Re-run directly with:');
  lines.push(`  ${commandForLog}`);

  if (parsedOutput.snapshots?.includes('failed')) {
    lines.push('Update snapshots with:');
    lines.push(`  ${commandForLog} -u`);
  }

  return lines.join('\n');
};

const isUnitJestConfigFile = (repoRelPath: string) => {
  const basename = Path.basename(repoRelPath);
  return JEST_CONFIG_NAMES.includes(basename as (typeof JEST_CONFIG_NAMES)[number]);
};

const isTestFile = (repoRelPath: string) => {
  return testMatchers.some((matcher) => matcher.test(repoRelPath));
};

const resolveOwningConfig = (repoRelPath: string) => {
  const absolutePath = Path.resolve(REPO_ROOT, repoRelPath);
  return findConfigInDirectoryTree(Path.dirname(absolutePath), [...JEST_CONFIG_NAMES]);
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

const runJestForConfig = async ({
  log,
  procRunner,
  configPath,
  passthroughArgs,
  relatedFiles,
}: {
  log: ToolingLog;
  procRunner: ProcRunnerLike;
  configPath: string;
  passthroughArgs: string[];
  relatedFiles?: string[];
}): Promise<ParsedJestRunOutput> => {
  const configRepoRel = Path.relative(REPO_ROOT, configPath);
  const args = ['scripts/jest', '--config', configRepoRel];
  const outputPath = createJestOutputPath(configRepoRel);

  if (relatedFiles && relatedFiles.length > 0) {
    args.push('--findRelatedTests', ...relatedFiles);
  }

  args.push('--passWithNoTests');
  args.push(...passthroughArgs);

  const commandForLog = `node ${args.join(' ')}`;

  try {
    await procRunner.run('jest', {
      cmd: process.execPath,
      args,
      cwd: REPO_ROOT,
      wait: true,
      writeLogsToPath: outputPath,
    });

    const parsedOutput = await readParsedJestRunOutput(outputPath);
    const summary = formatJestRunSummary(parsedOutput);
    log.success(`${JEST_LOG_PREFIX} passed ${configRepoRel}${summary ? ` (${summary})` : ''}`);
    return parsedOutput;
  } catch {
    const parsedOutput = await readParsedJestRunOutput(outputPath);
    throw createFailError(
      buildJestFailureMessage({
        commandForLog,
        configRepoRel,
        parsedOutput,
      })
    );
  } finally {
    await Fsp.unlink(outputPath).catch(() => undefined);
  }
};

const runJestAllConfigs = async ({
  procRunner,
  passthroughArgs,
}: {
  procRunner: ProcRunnerLike;
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

/**
 * Resolves scoped Jest targets from the validation contract and executes the
 * required config runs, including downstream expansion when requested.
 */
export const executeJestValidation = async ({
  baseContext,
  log,
  passthroughArgs = [],
  procRunner,
  onConfigResult,
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

  const testMode = baseContext.contract.testMode;
  if (testMode === 'all') {
    throw new Error(
      'Unexpected Jest contract state: testMode=all should have been handled earlier.'
    );
  }

  const plans = planJestContractRuns({
    entries: changedFiles.map((repoRelPath) => {
      const owningConfigPath = isUnitJestConfigFile(repoRelPath)
        ? undefined
        : resolveOwningConfig(repoRelPath) ?? undefined;

      return {
        repoRelPath,
        owningConfigPath,
        isConfigFile: isUnitJestConfigFile(repoRelPath),
        isTestFile: isTestFile(repoRelPath),
      };
    }),
    testMode,
  });

  // When downstream expansion is requested (e.g. --profile pr), discover jest
  // configs in downstream-affected Moon projects that aren't already covered.
  const { downstream } = baseContext.contract;
  if (downstream !== 'none' && changedFiles.length > 0) {
    const changedFilesJson = JSON.stringify({ files: changedFiles });
    const affected = await resolveValidationAffectedProjects({
      changedFilesJson,
      downstream,
    });

    const coveredConfigs = new Set(plans.map((p) => p.configPath));
    for (const sourceRoot of affected.affectedSourceRoots) {
      const absRoot = Path.resolve(REPO_ROOT, sourceRoot);
      for (const configName of JEST_CONFIG_NAMES) {
        const configPath = Path.join(absRoot, configName);
        if (!coveredConfigs.has(configPath) && existsSync(configPath)) {
          plans.push({ configPath, mode: 'full' });
          coveredConfigs.add(configPath);
        }
      }
    }
  }

  if (plans.length === 0) {
    const noTargetsLabel =
      baseContext.contract.testMode === 'related'
        ? 'No related Jest targets found'
        : 'No affected Jest targets found';
    log.info(`${noTargetsLabel} ${describeValidationNoTargetsScope(baseContext)}; skipping jest.`);
    return null;
  }

  log.info(`${JEST_LOG_PREFIX} planned ${plans.length} config run(s).`);
  let totalTests = 0;

  for (const [index, plan] of plans.entries()) {
    const configRepoRel = Path.relative(REPO_ROOT, plan.configPath);
    const relatedFiles = plan.mode === 'related' ? plan.relatedFiles ?? [] : undefined;
    const commandForLog = `node scripts/jest --config ${configRepoRel}${
      relatedFiles ? ` --findRelatedTests ${relatedFiles.join(' ')}` : ''
    }`;

    if (plan.mode === 'full') {
      log.info(`${JEST_LOG_PREFIX} ${index + 1}/${plans.length} full ${configRepoRel}`);
    } else {
      log.info(
        `${JEST_LOG_PREFIX} ${index + 1}/${plans.length} related ${configRepoRel} (${
          (relatedFiles ?? []).length
        } file(s))`
      );
    }

    try {
      const parsedOutput = await runJestForConfig({
        log,
        procRunner,
        configPath: plan.configPath,
        passthroughArgs,
        relatedFiles,
      });

      const testCount = extractTestCount(parsedOutput);
      totalTests += testCount;

      onConfigResult?.({
        index: index + 1,
        total: plans.length,
        config: configRepoRel,
        passed: true,
        testCount,
        command: commandForLog,
      });
    } catch (error) {
      onConfigResult?.({
        index: index + 1,
        total: plans.length,
        config: configRepoRel,
        passed: false,
        testCount: 0,
        failureOutput: error instanceof Error ? error.message : String(error),
        command: commandForLog,
      });
      throw error;
    }
  }

  log.success(`${JEST_LABEL} contract run passed (${plans.length} config run(s)).`);
  return { configCount: plans.length, testCount: totalTests };
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

      const shouldUseQuietProcRunner =
        baseContext.mode !== 'contract' ||
        (baseContext.runContext.kind !== 'full' && baseContext.contract.testMode !== 'all');
      const quietProcRunner = shouldUseQuietProcRunner ? createQuietProcRunner(log) : undefined;

      try {
        await executeJestValidation({
          baseContext,
          log,
          passthroughArgs,
          procRunner: quietProcRunner ?? procRunner,
        });
      } finally {
        await quietProcRunner?.teardown();
      }
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
        help: `
${VALIDATION_RUN_HELP}
        `,
      },
    }
  );
};
