/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile, execFileSync, spawn } from 'child_process';
import { availableParallelism } from 'os';
import { isAbsolute, join, normalize, relative } from 'path';
import { existsSync, readFileSync, rmSync, unlinkSync } from 'fs';

import type { RunOptions } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { getMoonExecutablePath } from '@kbn/moon';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

const MAX_PARALLELISM = availableParallelism();
const MOON_PROJECT = 'quick-checks';
const MOON_PROJECT_CONFIG = join('.moon', 'projects', 'quick-checks', 'moon.yml');
const MOON_CACHE_DIR = join(REPO_ROOT, '.moon', 'cache');
const MOON_RUN_REPORT = join(MOON_CACHE_DIR, 'runReport.json');
const COLLECT_COMMITS_MARKER_FILE = join(REPO_ROOT, '.collect_commits_marker');
const CANCEL_ON_GATE_FAILURE_SCRIPT = join(
  REPO_ROOT,
  '.buildkite',
  'scripts',
  'steps',
  'gate_failure',
  'cancel.sh'
);
const MAX_ANNOTATION_OUTPUT_LINES = 50;
const COMMIT_MARKER_POLL_INTERVAL_MS = 1000;

export interface QuickCheck {
  /** Moon task ID in the `quick-checks` project. */
  id: string;
  /** Repository-relative path of the check script. */
  script: string;
  /** True when the check holds a Moon mutex, so it never runs alongside other exclusive checks. */
  exclusive: boolean;
}

export interface CheckResult {
  success: boolean;
  check: string;
  script: string;
  output: string;
  durationMs: number;
}

interface MoonTask {
  args?: string[];
  options: { mutex?: string | null };
}

export interface MoonTaskQuery {
  tasks: Record<string, Record<string, MoonTask>>;
}

interface MoonDuration {
  secs: number;
  nanos: number;
}

interface MoonRunAction {
  status: string;
  duration?: MoonDuration | null;
  node: { action: string; params?: { target?: string } };
}

export interface MoonRunReport {
  actions: MoonRunAction[];
}

const scriptOptions: RunOptions = {
  description: `
    Runs sanity-testing quick-checks in parallel, as tasks of the '${MOON_PROJECT}' Moon project (${MOON_PROJECT_CONFIG}).
  `,
  flags: {
    string: ['checks'],
    help: `
        --checks           Runs only the given checks, by Moon task ID or script path. (comma or newline delimited)
      `,
  },
  log: {
    context: 'quick-checks',
    defaultLevel: process.env.CI === 'true' ? 'debug' : 'info',
  },
};

let logger: ToolingLog;
void run(async ({ log, flagsReader }) => {
  logger = log;

  // Clean up any existing marker file from previous runs
  if (existsSync(COLLECT_COMMITS_MARKER_FILE)) {
    unlinkSync(COLLECT_COMMITS_MARKER_FILE);
  }

  // Set environment variable so check scripts know where to write the marker file
  process.env.COLLECT_COMMITS_MARKER_FILE = COLLECT_COMMITS_MARKER_FILE;

  const moon = await getMoonExecutablePath();
  const checksToRun = selectQuickChecks(queryQuickChecks(moon), flagsReader.string('checks'));
  const exclusiveCount = checksToRun.filter(({ exclusive }) => exclusive).length;
  // A check waiting for the Moon mutex holds a pipeline slot, so reserve one per exclusive check.
  const concurrency = MAX_PARALLELISM + exclusiveCount;

  logger.write(
    `--- Running ${
      checksToRun.length
    } checks with Moon (${exclusiveCount} workspace-exclusive with parallelism=1, ${
      checksToRun.length - exclusiveCount
    } regular with parallelism=${MAX_PARALLELISM})...`
  );
  const startTime = Date.now();
  const moonExitCode = await runMoonChecks(moon, checksToRun, concurrency);
  const results = collectCheckResults(readMoonRunReport(), checksToRun, readTaskOutput);

  logger.write('--- All checks finished.');
  printResults(startTime, results);

  // Check if any commits were made and push them in a single batch
  // This allows multiple quick-check fixes to be committed and pushed together,
  // avoiding multiple CI restarts when a PR has multiple offenses.
  // File-changing checks share a Moon mutex and run one at a time, so commits happen
  // one at a time without conflicts.
  const commitsWereMade = existsSync(COLLECT_COMMITS_MARKER_FILE);
  if (commitsWereMade) {
    logger.write('--- Commits were made during checks. Pushing all changes now...');
    try {
      await pushCommits();
      logger.write('--- Successfully pushed all commits.');
      // Clean up marker file
      if (existsSync(COLLECT_COMMITS_MARKER_FILE)) {
        unlinkSync(COLLECT_COMMITS_MARKER_FILE);
      }
      // Still exit with error to fail the current build, a new build should be started after the push
      logger.write('--- Build will fail to trigger a new build with the fixes.');
      process.exitCode = 1;
    } catch (error) {
      logger.error(`--- Failed to push commits: ${error}`);
      process.exitCode = 1;
    }
  }

  const failedChecks = results.filter((check) => !check.success);
  if (failedChecks.length > 0) {
    logger.write(`--- ${failedChecks.length} quick check(s) failed. ❌`);
    logger.write(`See the check(s) marked with ❌ above for details.`);
    annotateFailures(failedChecks);
    process.exitCode = 1;
  } else if (moonExitCode !== 0) {
    logger.error(`--- Moon exited with code ${moonExitCode}. See the Moon output above.`);
    process.exitCode = 1;
  } else if (!commitsWereMade) {
    logger.write('--- All checks passed. ✅');
    return results;
  }
}, scriptOptions);

const toRepoRelativePath = (path: string): string =>
  normalize(isAbsolute(path) ? relative(REPO_ROOT, path) : path);

/** Lists the quick checks defined as tasks of the `quick-checks` Moon project. */
export const parseQuickChecks = ({ tasks }: MoonTaskQuery): QuickCheck[] =>
  Object.entries(tasks[MOON_PROJECT] ?? {}).map(([id, { args = [], options }]) => ({
    id,
    script: args.find((arg) => arg.endsWith('.sh')) ?? '',
    exclusive: Boolean(options.mutex),
  }));

const queryQuickChecks = (moon: string): QuickCheck[] => {
  const query = execFileSync(moon, ['query', 'tasks', '--project', MOON_PROJECT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  const checks = parseQuickChecks(JSON.parse(query) as MoonTaskQuery);
  if (checks.length === 0) {
    throw createFailError(`No quick checks found in Moon project '${MOON_PROJECT}'`);
  }

  return checks;
};

/** Selects the checks named by `--checks` (task IDs or script paths), or every check. */
export const selectQuickChecks = (checks: QuickCheck[], selection?: string): QuickCheck[] => {
  const names = (selection ?? '')
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) {
    return checks;
  }

  const unknown: string[] = [];
  const selected = new Set<QuickCheck>();
  for (const name of names) {
    const check = checks.find(
      ({ id, script }) => id === name || script === toRepoRelativePath(name)
    );
    if (check) {
      selected.add(check);
    } else {
      unknown.push(name);
    }
  }

  if (unknown.length > 0) {
    throw createFailError(
      `Unknown quick check(s): ${unknown.join(', ')}. Available checks: ${checks
        .map(({ id }) => id)
        .join(', ')}`
    );
  }

  return [...selected];
};

const toMoonTarget = ({ id }: QuickCheck): string => `${MOON_PROJECT}:${id}`;

const toMs = ({ secs, nanos }: MoonDuration): number => secs * 1000 + Math.round(nanos / 1e6);

/** Builds a result for each check from Moon's run report. */
export const collectCheckResults = (
  report: MoonRunReport | undefined,
  checks: QuickCheck[],
  readOutput: (check: QuickCheck) => string
): CheckResult[] => {
  const actionsByTarget = new Map(
    (report?.actions ?? [])
      .filter(({ node }) => node.action === 'run-task' && node.params?.target)
      .map((action) => [action.node.params?.target, action])
  );

  return checks.map((check) => {
    const action = actionsByTarget.get(toMoonTarget(check));
    if (!action) {
      return {
        success: false,
        check: check.id,
        script: check.script,
        output: 'Moon did not report a result for this check. See the Moon output above.',
        durationMs: 0,
      };
    }

    const { status, duration } = action;
    const output = readOutput(check);
    return {
      success: status === 'passed',
      check: check.id,
      script: check.script,
      output: ['passed', 'failed'].includes(status)
        ? output
        : [output.trimEnd(), `Moon reported status '${status}' for this check.`]
            .filter(Boolean)
            .join('\n'),
      durationMs: duration ? toMs(duration) : 0,
    };
  });
};

const readMoonRunReport = (): MoonRunReport | undefined => {
  if (!existsSync(MOON_RUN_REPORT)) {
    return undefined;
  }

  return JSON.parse(readFileSync(MOON_RUN_REPORT, 'utf8')) as MoonRunReport;
};

const readTaskOutput = ({ id }: QuickCheck): string =>
  ['stdout.log', 'stderr.log']
    .map((file) => join(MOON_CACHE_DIR, 'states', MOON_PROJECT, id, file))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('');

const runMoonChecks = async (
  moon: string,
  checks: QuickCheck[],
  concurrency: number
): Promise<number> => {
  // Remove the previous report so a crashed run cannot report stale results.
  rmSync(MOON_RUN_REPORT, { force: true });

  const commitMarkerPoll = setInterval(
    () => cancelGatedStepsOnFirstCommit(logger),
    COMMIT_MARKER_POLL_INTERVAL_MS
  );

  try {
    return await new Promise<number>((resolve, reject) => {
      const moonProcess = spawn(
        moon,
        [
          'exec',
          ...checks.map(toMoonTarget),
          // Run every check, not only those Moon considers affected in CI.
          '--ci',
          'false',
          // Report every failed check, not only the first one.
          '--on-failure',
          'continue',
          '--no-actions',
          '--concurrency',
          String(concurrency),
        ],
        { cwd: REPO_ROOT, env: { ...process.env }, stdio: 'inherit' }
      );
      moonProcess.on('error', reject);
      moonProcess.on('exit', (code) => resolve(code ?? 1));
    });
  } finally {
    clearInterval(commitMarkerPoll);
    cancelGatedStepsOnFirstCommit(logger);
  }
};

let gatedStepsCanceled = false;

/**
 * Cancels the cancel-on-gate-failure steps once the first auto-fix commit is recorded.
 */
export function cancelGatedStepsOnFirstCommit(log: ToolingLog): void {
  if (
    gatedStepsCanceled ||
    process.env.CHECK_GATE !== 'true' ||
    !existsSync(COLLECT_COMMITS_MARKER_FILE)
  ) {
    return;
  }

  // Commits are pushed only after every check finishes; the push supersedes this build anyway.
  gatedStepsCanceled = true;
  log.info('Auto-fix commit recorded, canceling gated steps before the push');
  spawn('bash', [CANCEL_ON_GATE_FAILURE_SCRIPT], { cwd: REPO_ROOT, stdio: 'inherit' }).on(
    'error',
    (error) => log.warning(`Failed to cancel gated steps early: ${error}`)
  );
}

function printResults(startTimestamp: number, results: CheckResult[]) {
  const totalDuration = results.reduce((acc, result) => acc + result.durationMs, 0);
  const total = humanizeTime(totalDuration);
  const effective = humanizeTime(Date.now() - startTimestamp);
  logger.info(`- Total time: ${total}, effective: ${effective}`);

  results.forEach((result) => {
    const resultLabel = result.success ? '✅' : '❌';
    const runtime = humanizeTime(result.durationMs);
    logger.write(`--- ${resultLabel} ${result.check} (${result.script}): ${runtime}`);
    if (result.success) {
      logger.debug(result.output);
    } else {
      logger.warning(result.output);
    }
  });
}

function humanizeTime(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms - minutes * 60 * 1000) / 1000);
  if (minutes === 0) {
    return `${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

function buildFailureAnnotation(check: CheckResult): string {
  const runtime = humanizeTime(check.durationMs);
  const lines = check.output.trim().split('\n');
  const truncated = lines.length > MAX_ANNOTATION_OUTPUT_LINES;
  const outputToShow = truncated ? lines.slice(-MAX_ANNOTATION_OUTPUT_LINES) : lines;
  const output = [
    ...(truncated ? [`… (truncated, showing last ${MAX_ANNOTATION_OUTPUT_LINES} lines)`] : []),
    ...outputToShow,
  ].join('\n');

  return [
    `<details>`,
    `<summary>❌ ${check.check}: ${check.script} (ran in ${runtime})</summary>`,
    '',
    '```',
    output,
    '```',
    `</details>`,
  ].join('\n');
}

export function buildPipelineAnnotation(failedChecks: CheckResult[]): string {
  const sections = failedChecks.map(buildFailureAnnotation);
  const reproduceChecks = failedChecks.map(({ check }) => check).join(',');

  return [
    `## ❌ ${failedChecks.length} quick-check(s) failed`,
    '',
    `The following quick-check(s) failed. Run them locally to reproduce and fix:`,
    '',
    ...sections,
    '',
    `To reproduce locally:`,
    '```',
    `node scripts/quick_checks --checks ${reproduceChecks}`,
    '```',
  ].join('\n');
}

function annotateFailures(failedChecks: CheckResult[]): void {
  if (process.env.CI !== 'true' || failedChecks.length === 0) {
    return;
  }

  try {
    execFileSync('buildkite-agent', ['annotate', '--style', 'error', '--context', 'quick_checks'], {
      input: buildPipelineAnnotation(failedChecks),
    });
  } catch (error) {
    logger.warning(`Failed to create Buildkite annotation for failed quick checks: ${error}`);
  }
}

async function pushCommits(): Promise<void> {
  return new Promise((resolve, reject) => {
    const pushProcess = execFile('git', ['push'], {
      cwd: REPO_ROOT,
      env: { ...process.env },
    });

    let output = '';
    const appendToOutput = (data: string | Buffer) => (output += data.toString());

    pushProcess.stdout?.on('data', appendToOutput);
    pushProcess.stderr?.on('data', appendToOutput);

    pushProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`git push failed with code ${code}: ${output}`));
      }
    });

    pushProcess.on('error', (error) => {
      reject(error);
    });
  });
}
