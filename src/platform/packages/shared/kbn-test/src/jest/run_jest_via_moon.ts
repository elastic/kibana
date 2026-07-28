/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import Os from 'os';
import Path from 'path';

import execa from 'execa';

import { getMoonExecutablePath } from '@kbn/moon';
import { REPO_ROOT } from '@kbn/repo-info';

// ── Constants ──────────────────────────────────────────────────────────────

export const JEST_CONFIG_NAMES = [
  'jest.config.dev.js',
  'jest.config.js',
  'jest.config.cjs',
  'jest.config.mjs',
  'jest.config.ts',
  'jest.config.json',
] as const;

// ── Types ──────────────────────────────────────────────────────────────────

export interface JestFailedTest {
  file: string;
  line?: number;
  name: string;
  message: string;
  /** True when the failure message matches a known Jest worker OOM/crash signature. */
  oom?: boolean;
}

export interface MoonJestTaskResult {
  project: string;
  configPath?: string;
  cached: boolean;
  passed: boolean;
  testCount: number;
  failures: JestFailedTest[];
}

export interface MoonJestResult {
  taskCount: number;
  cachedCount: number;
  totalTests: number;
  failed: MoonJestTaskResult[];
  exitCode: number;
  verboseDetail?: string;
  failureExcerpt?: string[];
  warnings?: string[];
}

export interface MoonJestProgress {
  completedCount: number;
}

export interface MoonJestParseResult {
  tasks: MoonJestTaskResult[];
  parseFailures: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

/** Mirrors CI's unit-test heap cap (`.buildkite/scripts/steps/test/jest_parallel.sh`). */
export const JEST_WORKER_MAX_OLD_SPACE_MB = 4096;

/** Leave headroom for the OS, IDE, browser, and Kibana dev server sharing the machine. */
const AVAILABLE_MEMORY_FRACTION = 0.75;

/**
 * Node/V8 takes the last of duplicate `--max-old-space-size` flags in NODE_OPTIONS, so the
 * default must come first: it acts as a floor when NODE_OPTIONS is unset, but a caller who
 * already set their own `--max-old-space-size` (e.g. following the OOM remediation message
 * run_check.ts prints) still wins.
 */
export const buildJestNodeOptions = (existingNodeOptions?: string): string =>
  [`--max-old-space-size=${JEST_WORKER_MAX_OLD_SPACE_MB}`, existingNodeOptions]
    .filter(Boolean)
    .join(' ');

/**
 * Matches the literal errors jest-worker raises for a crashed/OOM-killed worker
 * (see `_onExit`/`_detectOutOfMemoryCrash` in jest-worker's ChildProcessWorker and
 * NodeThreadsWorker) once Jest has wrapped them into a suite's testExecError/message.
 * These are the strings that actually show up in `--json` output; the raw V8
 * "heap out of memory" crash text never reaches this field, see RAW_OOM_SIGNATURE_RE below.
 */
const WORKER_OOM_MESSAGE_RE =
  /Jest worker encountered \d+ child process exceptions, exceeding retry limit|Jest worker ran out of memory and crashed/i;

/**
 * Mirrors jest-worker's own out-of-memory heuristic (`_detectOutOfMemoryCrash`, which
 * scans a crashed child's raw stderr for these substrings). Used to recognize an OOM
 * when the whole Jest process dies before producing any JSON for us to parse.
 */
const RAW_OOM_SIGNATURE_RE = /heap out of memory|allocation failure;|Last few GCs/i;

/** Walk up from a test file to find the nearest jest config. */
export const findJestConfig = (testFilePath: string): string | undefined => {
  let dir = Path.dirname(Path.resolve(REPO_ROOT, testFilePath));
  while (true) {
    for (const configName of JEST_CONFIG_NAMES) {
      const configPath = Path.join(dir, configName);
      if (existsSync(configPath)) {
        return Path.relative(REPO_ROOT, configPath);
      }
    }

    if (dir === REPO_ROOT || dir === Path.dirname(dir)) {
      break;
    }

    dir = Path.dirname(dir);
  }
  return undefined;
};

/** Find the owning package directory for a file (longest prefix match). */
const findOwningPackage = (file: string, dirs: string[]): string | undefined => {
  let best: string | undefined;
  for (const dir of dirs) {
    if (file.startsWith(dir + '/') && (!best || dir.length > best.length)) {
      best = dir;
    }
  }
  return best;
};

interface AffectedPackageInfo {
  dirs: string[];
  jestDirs: string[];
}

const resolveAffectedPackageInfo = async (files: string[]): Promise<AffectedPackageInfo> => {
  const { getPackages } = await import('@kbn/repo-packages');
  const sortedDirs = getPackages(REPO_ROOT)
    .map((pkg) => Path.relative(REPO_ROOT, pkg.directory))
    .sort();

  const matched = new Set<string>();
  for (const file of files) {
    const owner = findOwningPackage(file, sortedDirs);
    if (owner) {
      matched.add(owner);
    }
  }

  const dirs = [...matched];
  const jestDirs = dirs.filter((dir) =>
    JEST_CONFIG_NAMES.some((name) => existsSync(Path.resolve(REPO_ROOT, dir, name)))
  );

  return { dirs, jestDirs };
};

/**
 * Keep Moon concurrency low so cache-heavy affected runs do not starve the real
 * Jest work of CPU. Example: if 4 configs are scheduled and 3 are cached, we
 * want the 1 uncached Jest process to keep most cores instead of reserving them
 * for Moon slots that finish immediately.
 *
 * maxWorkers is also capped by available memory: on high-core, lower-RAM machines,
 * sizing purely off `cpus` can schedule more concurrent Jest worker processes than
 * the machine can actually hold (each capped at JEST_WORKER_MAX_OLD_SPACE_MB), which
 * OOM-kills a worker without it looking any different from a real test failure.
 *
 * - maxWorkers never drops below 2
 * - Moon concurrency caps at 2
 */
export const computeJestParallelism = (estimatedTasks: number) => {
  const cpus = Os.cpus().length;
  const availableMemMb = (Os.totalmem() / (1024 * 1024)) * AVAILABLE_MEMORY_FRACTION;
  const safeEstimatedTasks = Math.max(1, estimatedTasks);
  const concurrency = Math.min(safeEstimatedTasks, 2);

  const cpuBoundWorkers = Math.floor(cpus / concurrency);
  const memoryBoundWorkers = Math.floor(
    availableMemMb / JEST_WORKER_MAX_OLD_SPACE_MB / concurrency
  );

  const maxWorkers = Math.max(2, Math.min(cpuBoundWorkers, memoryBoundWorkers));
  return { concurrency, maxWorkers };
};

// ── Output parsing ─────────────────────────────────────────────────────────

export const parseMoonJestOutput = (output: string): MoonJestParseResult => {
  const results = new Map<string, MoonJestTaskResult>();
  const cachedProjects = new Set<string>();
  const parseFailures: string[] = [];

  for (const rawLine of output.split('\n')) {
    const stripped = stripAnsi(rawLine).trim();

    // "pass RunTask(@kbn/foo:jest) (cached, ...)" from --summary detailed
    const cachedMatch = stripped.match(/^pass RunTask\((@[^:]+):jest\) \(cached/);
    if (cachedMatch) {
      cachedProjects.add(cachedMatch[1]);
      continue;
    }

    // Jest --json output: either prefixed "@kbn/foo:jest | {...}" or unprefixed "{...}"
    const jsonPrefixMatch = stripped.match(/^(@[^:]+):jest \| \{/);
    const isUnprefixedJson = !jsonPrefixMatch && stripped.startsWith('{"num');
    if (jsonPrefixMatch || isUnprefixedJson) {
      const project = jsonPrefixMatch ? jsonPrefixMatch[1] : '_single';
      const jsonStr = stripped.replace(/^[^{]*/, '');
      try {
        const json = JSON.parse(jsonStr);
        const failures: JestFailedTest[] = [];

        for (const suite of json.testResults ?? []) {
          const file = Path.relative(REPO_ROOT, suite.name);
          const assertionResults = suite.assertionResults ?? [];

          for (const assertion of assertionResults) {
            if (assertion.status === 'failed') {
              const message = (assertion.failureMessages ?? []).join('\n');
              const lineMatch = stripAnsi(message).match(
                new RegExp(`${suite.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`)
              );
              failures.push({
                file,
                line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
                name: assertion.fullName ?? assertion.title ?? 'unknown',
                message,
                oom: WORKER_OOM_MESSAGE_RE.test(message),
              });
            }
          }

          // A crashed worker can kill a suite before it runs any assertions; Jest's
          // formatTestResults flattens that suite-level testExecError into `message`
          // (there is no separate `testExecError` key in the --json output).
          if (assertionResults.length === 0 && suite.status === 'failed') {
            const message = suite.message ?? '';
            failures.push({
              file,
              name: 'Test suite failed to run',
              message,
              oom: WORKER_OOM_MESSAGE_RE.test(message),
            });
          }
        }

        const firstTestFile = json.testResults?.[0]?.name;
        results.set(project, {
          project,
          configPath: firstTestFile
            ? findJestConfig(Path.relative(REPO_ROOT, firstTestFile))
            : undefined,
          cached: false,
          passed: json.success === true,
          testCount: json.numTotalTests ?? 0,
          failures,
        });
      } catch (err) {
        parseFailures.push(
          `Failed to parse Jest JSON from project ${project}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  // Mark cached tasks (they replay JSON output, so they'll be in results already)
  for (const project of cachedProjects) {
    const existing = results.get(project);
    if (existing) {
      existing.cached = true;
    } else {
      results.set(project, {
        project,
        cached: true,
        passed: true,
        testCount: 0,
        failures: [],
      });
    }
  }

  return { tasks: [...results.values()], parseFailures };
};

const extractMoonFailureExcerpt = (output: string) => {
  return output
    .split('\n')
    .map((lineText) => stripAnsi(lineText).trim())
    .filter(Boolean)
    .filter((lineText) => !lineText.startsWith('{'))
    .slice(-8);
};

/**
 * When Moon exits non-zero and no Jest task JSON was parsed at all, the Jest process
 * likely crashed before it could report anything. Check the raw output for the same
 * V8 crash signature jest-worker itself looks for (RAW_OOM_SIGNATURE_RE) so we can tell
 * the user "this was OOM" instead of a generic "no output parsed" message.
 */
export const buildMoonJestWarnings = ({
  output,
  exitCode,
  taskCount,
  parseFailures,
}: {
  output: string;
  exitCode: number;
  taskCount: number;
  parseFailures: string[];
}): string[] | undefined => {
  if (taskCount === 0 && exitCode !== 0) {
    const noOutputMessage = RAW_OOM_SIGNATURE_RE.test(output)
      ? `Moon exited with code ${exitCode} and the output contains a Node/V8 out-of-memory ` +
        `crash signature. The Jest process likely ran out of heap before producing any JSON ` +
        `output; try freeing up memory or narrowing the affected files so fewer configs run ` +
        `at once.`
      : `Moon exited with code ${exitCode} but no Jest task output was parsed. ` +
        `The Jest task may have failed before producing JSON output, run jest directly to verify.`;
    return [noOutputMessage, ...parseFailures];
  }

  return parseFailures.length > 0 ? parseFailures : undefined;
};

const parseMoonJestProgressProject = (rawLine: string) => {
  const stripped = stripAnsi(rawLine).trim();

  const cachedSummaryMatch = stripped.match(/^pass RunTask\((@[^:]+):jest\) \(cached/);
  if (cachedSummaryMatch) {
    return cachedSummaryMatch[1];
  }

  const summaryMatch = stripped.match(/^(?:pass|fail) RunTask\((@[^:]+):jest\) \(/);
  if (summaryMatch) {
    return summaryMatch[1];
  }

  const jsonPrefixMatch = stripped.match(/^(@[^:]+):jest \| \{/);
  if (jsonPrefixMatch) {
    return jsonPrefixMatch[1];
  }

  return undefined;
};

const attachOutputLineListeners = ({
  stream,
  onChunk,
  onLine,
}: {
  stream?: NodeJS.ReadableStream | null;
  onChunk: (chunk: string) => void;
  onLine: (line: string) => void;
}) => {
  if (!stream) {
    return;
  }

  let pending = '';
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    onChunk(text);
    pending += text;

    while (true) {
      const newlineIndex = pending.indexOf('\n');
      if (newlineIndex === -1) {
        break;
      }

      onLine(pending.slice(0, newlineIndex));
      pending = pending.slice(newlineIndex + 1);
    }
  });

  stream.on('end', () => {
    if (pending.length > 0) {
      onLine(pending);
    }
  });
};

// ── Core execution ─────────────────────────────────────────────────────────

export const runJestViaMoon = async ({
  changedFiles,
  verbose = false,
  downstream = 'none',
  onProgress,
}: {
  changedFiles: string[];
  verbose?: boolean;
  downstream?: string;
  onProgress?: (progress: MoonJestProgress) => void;
}): Promise<MoonJestResult> => {
  const packageInfo = await resolveAffectedPackageInfo(changedFiles);
  const changedFilesJson = JSON.stringify({ files: changedFiles });

  const moonExec = await getMoonExecutablePath();
  const { concurrency, maxWorkers } = computeJestParallelism(
    Math.max(packageInfo.jestDirs.length, packageInfo.dirs.length)
  );
  const cpus = Os.cpus().length;
  const completedProjects = new Set<string>();

  const subprocess = execa(
    moonExec,
    [
      'run',
      ':jest',
      '--affected',
      '--stdin',
      ...(downstream !== 'none' ? ['--downstream', downstream] : []),
      '--concurrency',
      String(concurrency),
      '--summary',
      'detailed',
      '--',
      `--maxWorkers=${maxWorkers}`,
      '--json',
      '--passWithNoTests',
    ],
    {
      cwd: REPO_ROOT,
      input: changedFilesJson,
      reject: false,
      env: {
        ...process.env,
        CI_STATS_DISABLED: 'true',
        FORCE_COLOR: '1',
        // Cap each Jest worker's heap explicitly (mirrors CI) instead of relying on Node's
        // per-machine default, which isn't sized for `concurrency * maxWorkers` processes
        // running at once and can silently OOM a worker.
        NODE_OPTIONS: buildJestNodeOptions(process.env.NODE_OPTIONS),
      },
    }
  );

  let capturedStdout = '';
  let capturedStderr = '';

  const handleOutputLine = (lineText: string) => {
    const project = parseMoonJestProgressProject(lineText);
    if (!project || completedProjects.has(project)) {
      return;
    }

    completedProjects.add(project);
    onProgress?.({
      completedCount: completedProjects.size,
    });
  };

  attachOutputLineListeners({
    stream: 'stdout' in subprocess ? subprocess.stdout : undefined,
    onChunk: (chunk) => {
      capturedStdout += chunk;
    },
    onLine: handleOutputLine,
  });
  attachOutputLineListeners({
    stream: 'stderr' in subprocess ? subprocess.stderr : undefined,
    onChunk: (chunk) => {
      capturedStderr += chunk;
    },
    onLine: handleOutputLine,
  });

  const result = await subprocess;

  const output =
    (capturedStdout || result.stdout || '') + '\n' + (capturedStderr || result.stderr || '');
  const { tasks, parseFailures } = parseMoonJestOutput(output);
  const failed = tasks.filter((t) => !t.passed && !t.cached);

  const cachedCount = tasks.filter((t) => t.cached).length;
  const ranCount = tasks.length - cachedCount;
  const warnings = buildMoonJestWarnings({
    output,
    exitCode: result.exitCode ?? 0,
    taskCount: tasks.length,
    parseFailures,
  });

  return {
    taskCount: tasks.length,
    cachedCount,
    totalTests: tasks.reduce((sum, t) => sum + t.testCount, 0),
    failed,
    exitCode: result.exitCode ?? 0,
    failureExcerpt:
      tasks.length === 0 && result.exitCode !== 0 ? extractMoonFailureExcerpt(output) : undefined,
    warnings,
    verboseDetail: verbose
      ? `${packageInfo.jestDirs.length} packages, ${ranCount} ran, ${cachedCount} cached, ${cpus} cpus → concurrency=${concurrency}, maxWorkers=${maxWorkers}`
      : undefined,
  };
};
