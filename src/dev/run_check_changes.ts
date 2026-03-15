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

import { run } from '@kbn/dev-cli-runner';
import { ProcRunner } from '@kbn/dev-proc-runner';
import {
  readValidationRunFlags,
  resolveValidationBaseContext,
  type ValidationBaseContext,
  VALIDATION_RUN_HELP,
  VALIDATION_RUN_STRING_FLAGS,
} from '@kbn/dev-validation-runner';
import { getMoonExecutablePath } from '@kbn/moon';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog, type Message, type Writer } from '@kbn/tooling-log';
import { executeTypeCheckValidation } from './type_check_validation_loader';

import { executeEslintValidation } from './eslint/run_eslint_contract';

// ── Output helpers ──────────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY === true;
const write = (text: string) => process.stdout.write(text);
const writeln = (text: string) => write(text + '\n');
const clearLine = () => write('\r\x1B[2K');

const formatDuration = (ms: number) =>
  ms < 1_000 ? `${Math.round(ms)}ms` : `${(ms / 1_000).toFixed(1)}s`;

const pluralize = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? '' : 's'}`;

const pad = (label: string) => label.padEnd(6);

const line = (label: string, symbol: string, detail: string, duration?: string) =>
  `  ${pad(label)}${symbol} ${detail}${duration ? `  ${duration}` : ''}`;

/** Start a ticking progress line. Returns { stop, writeResult } to finalize. */
const startProgress = (label: string, detail?: string) => {
  const start = Date.now();
  const msg = detail ? `${detail} ...` : '...';

  if (isTTY) {
    write(`  ${pad(label)}${msg}`);
  }

  const timer = isTTY
    ? setInterval(() => {
        clearLine();
        write(`  ${pad(label)}${msg} ${formatDuration(Date.now() - start)}`);
      }, 1_000)
    : undefined;

  return {
    elapsed: () => formatDuration(Date.now() - start),
    writeResult: (text: string) => {
      if (timer) clearInterval(timer);
      if (isTTY) clearLine();
      writeln(text);
    },
  };
};

// ── Silent logging ──────────────────────────────────────────────────────────

const createCapturingWriter = (): { writer: Writer; captured: string[] } => {
  const captured: string[] = [];
  return {
    captured,
    writer: {
      write(msg: Message) {
        const text = msg.args.map(String).join(' ').trim();
        if (text && (msg.type === 'error' || msg.type === 'warning' || msg.type === 'write')) {
          captured.push(text);
        }
        return true;
      },
    },
  };
};

const createSilentLog = () => {
  const { writer, captured } = createCapturingWriter();
  const log = new ToolingLog();
  log.setWriters([writer]);
  return { log, captured };
};

const createSilentProcRunner = () => {
  const log = new ToolingLog();
  return new ProcRunner(log);
};

// ── Header ──────────────────────────────────────────────────────────────────

const formatHeader = (baseContext: ValidationBaseContext) => {
  if (baseContext.mode === 'direct_target') {
    return `check_changes  target=${baseContext.directTarget}`;
  }

  const { contract, runContext } = baseContext;

  if (runContext.kind === 'affected' && runContext.resolvedBase && contract.scope === 'branch') {
    const base = runContext.resolvedBase.baseRef;
    const sha = runContext.resolvedBase.base.slice(0, 12);
    const commits =
      runContext.branchCommitCount !== undefined ? `  ${runContext.branchCommitCount} commits` : '';
    return `check_changes  branch  ${base} (${sha})..HEAD${commits}`;
  }

  return `check_changes  scope=${contract.scope}`;
};

// ── Jest via Moon ───────────────────────────────────────────────────────────

const TEST_FILE_RE = /\.test\.(js|mjs|ts|tsx)$/;

const isTestFile = (filePath: string) => TEST_FILE_RE.test(filePath);

interface JestFailedTest {
  file: string;
  line?: number;
  name: string;
  message: string;
}

interface MoonJestTaskResult {
  project: string;
  configPath?: string;
  cached: boolean;
  passed: boolean;
  testCount: number;
  failures: JestFailedTest[];
}

const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, '');

const findJestConfig = (testFilePath: string): string | undefined => {
  let dir = Path.dirname(Path.resolve(REPO_ROOT, testFilePath));
  while (dir !== REPO_ROOT && dir !== Path.dirname(dir)) {
    const configPath = Path.join(dir, 'jest.config.js');
    if (existsSync(configPath)) {
      return Path.relative(REPO_ROOT, configPath);
    }
    dir = Path.dirname(dir);
  }
  return undefined;
};

const parseMoonJestOutput = (output: string): MoonJestTaskResult[] => {
  const results = new Map<string, MoonJestTaskResult>();
  const cachedProjects = new Set<string>();

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
      const jsonStr = rawLine.trim().replace(/^[^{]*/, '');
      try {
        const json = JSON.parse(jsonStr);
        const failures: JestFailedTest[] = [];

        for (const suite of json.testResults ?? []) {
          const file = Path.relative(REPO_ROOT, suite.name);
          for (const assertion of suite.assertionResults ?? []) {
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
              });
            }
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
      } catch {
        // Ignore malformed JSON
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

  return [...results.values()];
};

interface AffectedPackageInfo {
  dirs: string[];
  jestDirs: string[];
}

/** Find affected package directories from changed file paths and check which have jest configs. */
const resolveAffectedPackageInfo = async (files: string[]): Promise<AffectedPackageInfo> => {
  const { getPackages } = await import('@kbn/repo-packages');
  const packageDirs = getPackages(REPO_ROOT).map((pkg) => Path.relative(REPO_ROOT, pkg.directory));

  const matched = new Set<string>();
  for (const file of files) {
    for (const dir of packageDirs) {
      if (file.startsWith(dir + '/')) {
        matched.add(dir);
        break;
      }
    }
  }

  const dirs = [...matched];
  const jestDirs = dirs.filter((dir) => existsSync(Path.resolve(REPO_ROOT, dir, 'jest.config.js')));

  return { dirs, jestDirs };
};

/**
 * Compute Moon concurrency and Jest maxWorkers to fill available CPUs.
 *
 * - maxWorkers never drops below 2 (keeps large configs fast)
 * - concurrency caps at floor(cpus / 2)
 */
const computeJestParallelism = (estimatedTasks: number) => {
  const cpus = Os.cpus().length;
  const maxConcurrency = Math.max(1, Math.floor(cpus / 2));
  const concurrency = Math.min(estimatedTasks, maxConcurrency);
  const maxWorkers = Math.max(2, Math.floor(cpus / concurrency));
  return { concurrency, maxWorkers };
};

interface JestPhaseResult {
  taskCount: number;
  cachedCount: number;
  totalTests: number;
  failed: MoonJestTaskResult[];
  verboseDetail?: string;
}

const runJestViaMoon = async (
  changedFilesJson: string,
  changedFiles: string[],
  verbose: boolean
): Promise<JestPhaseResult | null> => {
  const packageInfo = await resolveAffectedPackageInfo(changedFiles);

  if (packageInfo.jestDirs.length === 0) {
    return {
      taskCount: 0,
      cachedCount: 0,
      totalTests: 0,
      failed: [],
      verboseDetail: verbose
        ? `${packageInfo.dirs.length} affected packages, none with jest configs`
        : undefined,
    };
  }

  const execa = (await import('execa')).default;
  const moonExec = await getMoonExecutablePath();
  const { concurrency, maxWorkers } = computeJestParallelism(packageInfo.jestDirs.length);
  const cpus = Os.cpus().length;

  const result = await execa(
    moonExec,
    [
      'run',
      ':jest',
      '--affected',
      '--stdin',
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
      },
    }
  );

  const output = result.stdout + '\n' + result.stderr;
  const tasks = parseMoonJestOutput(output);
  const failed = tasks.filter((t) => !t.passed && !t.cached);

  const cachedCount = tasks.filter((t) => t.cached).length;
  const ranCount = tasks.length - cachedCount;

  return {
    taskCount: tasks.length,
    cachedCount,
    totalTests: tasks.reduce((sum, t) => sum + t.testCount, 0),
    failed,
    verboseDetail: verbose
      ? `${packageInfo.jestDirs.length} packages, ${ranCount} ran, ${cachedCount} cached, ${cpus} cpus → concurrency=${concurrency}, maxWorkers=${maxWorkers}`
      : undefined,
  };
};

const runJestTestsDirectly = async (
  testFiles: string[]
): Promise<{ testCount: number; passed: boolean; output: string }> => {
  const execa = (await import('execa')).default;
  const testPattern = testFiles.map((f) => Path.resolve(REPO_ROOT, f)).join('|');

  const result = await execa(
    process.execPath,
    ['scripts/jest', '--testPathPattern', testPattern, '--maxWorkers=2'],
    {
      cwd: REPO_ROOT,
      reject: false,
      env: { ...process.env, KBN_JEST_CONTRACT_DISABLED: 'true' },
    }
  );

  const testsMatch = result.stdout.match(/Tests:\s+.*?(\d+) total/);
  const testCount = testsMatch ? parseInt(testsMatch[1], 10) : 0;

  return {
    testCount,
    passed: result.exitCode === 0,
    output: result.stdout,
  };
};

// ── Main ────────────────────────────────────────────────────────────────────

run(
  async ({ flagsReader }) => {
    const verbose = flagsReader.boolean('verbose');
    const parsedValidationFlags = readValidationRunFlags(flagsReader);
    const hasValidationFlags = Object.values(parsedValidationFlags).some(
      (value) => value !== undefined
    );
    const validationFlags = hasValidationFlags
      ? parsedValidationFlags
      : { ...parsedValidationFlags, profile: 'quick' };

    const profile = validationFlags.profile ?? 'quick';
    if (isTTY) {
      write(`check_changes  profile=${profile} ...`);
    }

    const { log: resolveLog, captured: resolveErrors } = createSilentLog();
    const baseContext = await resolveValidationBaseContext({
      flags: validationFlags,
      runnerDescription: 'check_changes',
      onWarning: (message) => resolveErrors.push(message),
    });

    if (isTTY) {
      clearLine();
    }
    writeln(formatHeader(baseContext));

    const errors: Error[] = [];

    // Resolve changed files once for all checks.
    const changedFiles =
      baseContext.mode === 'contract' && baseContext.runContext.kind === 'affected'
        ? baseContext.runContext.changedFiles
        : [];
    const isSkipOrFull =
      baseContext.mode === 'contract' &&
      (baseContext.runContext.kind === 'skip' ||
        baseContext.runContext.kind === 'full' ||
        baseContext.contract.testMode === 'all');

    // ── lint ───────────────────────────────────────────────────────────

    {
      const { log, captured } = createSilentLog();
      const progress = startProgress('lint');
      try {
        const result = await executeEslintValidation({ baseContext, log, fix: true });
        if (!result) {
          progress.writeResult(line('lint', '—', 'no files changed'));
        } else {
          const fixNote =
            result.fixedFiles.length > 0
              ? ` (fixed ${pluralize(result.fixedFiles.length, 'file')})`
              : '';
          progress.writeResult(
            line(
              'lint',
              '✓',
              `${pluralize(result.fileCount, 'file')}${fixNote}`,
              progress.elapsed()
            )
          );
          if (verbose && result.fixedFiles.length > 0) {
            for (const file of result.fixedFiles) {
              writeln(`         fixed: ${file}`);
            }
          }
        }
      } catch (error) {
        progress.writeResult(line('lint', '✗', 'failed', progress.elapsed()));
        if (captured.length > 0) {
          writeln('');
          for (const msg of captured) writeln(`    ${msg}`);
        }
        writeln(`    → node scripts/eslint`);
        writeln('');
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // ── jest ───────────────────────────────────────────────────────────

    {
      const jestProgress = startProgress('jest');

      if (isSkipOrFull) {
        jestProgress.writeResult(
          line('jest', '—', 'skipped (use scripts/jest directly)', jestProgress.elapsed())
        );
      } else if (changedFiles.length === 0) {
        jestProgress.writeResult(line('jest', '—', 'no changed files', jestProgress.elapsed()));
      } else if (changedFiles.every(isTestFile)) {
        // Fast path: all changes are test files — run them directly.
        try {
          const result = await runJestTestsDirectly(changedFiles);
          if (result.passed) {
            const tests = result.testCount > 0 ? ` · ${result.testCount} tests` : '';
            jestProgress.writeResult(
              line('jest', '✓', `${changedFiles.length} test files${tests}`, jestProgress.elapsed())
            );
          } else {
            jestProgress.writeResult(line('jest', '✗', 'failed', jestProgress.elapsed()));
            writeln('');
            const excerpt = result.output.split('\n').slice(-15);
            for (const l of excerpt) writeln(`    ${l}`);
            writeln(`    → node scripts/jest --testPathPattern '${changedFiles.join('|')}'`);
            writeln('');
            errors.push(new Error('jest failed'));
          }
        } catch (error) {
          jestProgress.writeResult(line('jest', '✗', 'failed', jestProgress.elapsed()));
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      } else {
        // Normal path: run affected jest tasks via Moon.
        try {
          const changedFilesJson = JSON.stringify({ files: changedFiles });
          const result = await runJestViaMoon(changedFilesJson, changedFiles, verbose);

          const printVerbose = () => {
            if (result?.verboseDetail) {
              writeln(`         ${result.verboseDetail}`);
            }
          };

          const formatJestSummary = (r: JestPhaseResult) => {
            const ran = r.taskCount - r.cachedCount;
            const parts = [];
            if (ran > 0) parts.push(`${pluralize(ran, 'config')} ran`);
            if (r.cachedCount > 0) parts.push(`${pluralize(r.cachedCount, 'config')} cached`);
            if (r.totalTests > 0) parts.push(pluralize(r.totalTests, 'test'));
            return parts.join(', ');
          };

          if (!result || result.taskCount === 0) {
            jestProgress.writeResult(
              line('jest', '—', 'no affected configs', jestProgress.elapsed())
            );
            printVerbose();
          } else if (result.failed.length > 0) {
            const failCount = result.failed.length;
            jestProgress.writeResult(
              line(
                'jest',
                '✗',
                `${pluralize(failCount, 'config')} failed, ${formatJestSummary(result)}`,
                jestProgress.elapsed()
              )
            );
            writeln('');
            for (const task of result.failed) {
              // Group failures by file
              const byFile = new Map<string, JestFailedTest[]>();
              for (const f of task.failures) {
                const list = byFile.get(f.file) ?? [];
                list.push(f);
                byFile.set(f.file, list);
              }

              for (const [file, failures] of byFile) {
                const firstLine = failures[0]?.line;
                const fileRef = firstLine ? `${file}:${firstLine}` : file;
                writeln(`    FAIL ${fileRef}`);
                for (const f of failures) {
                  writeln(`      ● ${f.name}`);
                  writeln('');
                  // Strip ANSI for clean display, trim deep stack frames
                  const lines = stripAnsi(f.message).split('\n');
                  let pastFirstStackFrame = false;
                  for (const msgLine of lines) {
                    const trimmedLine = msgLine.trim();
                    if (trimmedLine.startsWith('at ') && pastFirstStackFrame) {
                      // Skip subsequent stack frames after the first
                      continue;
                    }
                    if (trimmedLine.startsWith('at ')) {
                      pastFirstStackFrame = true;
                    }
                    writeln(`        ${msgLine}`);
                  }
                  writeln('');
                }
              }

              const jestCmd = task.configPath
                ? `node scripts/jest --config ${task.configPath}`
                : `node scripts/jest`;
              writeln(`    → ${jestCmd}`);
              writeln('');
            }
            printVerbose();
            errors.push(new Error('jest failed'));
          } else {
            jestProgress.writeResult(
              line('jest', '✓', formatJestSummary(result), jestProgress.elapsed())
            );
            printVerbose();
          }
        } catch (error) {
          jestProgress.writeResult(line('jest', '✗', 'failed', jestProgress.elapsed()));
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    // ── tsc ────────────────────────────────────────────────────────────

    {
      const { log, captured } = createSilentLog();
      const procRunner = new ProcRunner(log);
      const tscProgress = startProgress('tsc');

      try {
        const result = await executeTypeCheckValidation({
          baseContext,
          log,
          procRunner,
          pretty: false,
        });

        if (!result) {
          tscProgress.writeResult(line('tsc', '—', 'no affected projects'));
        } else {
          tscProgress.writeResult(
            line('tsc', '✓', pluralize(result.projectCount, 'project'), tscProgress.elapsed())
          );
        }
      } catch (error) {
        tscProgress.writeResult(line('tsc', '✗', 'failed', tscProgress.elapsed()));

        // Parse error lines: convert file(line,col) → file:line:col, group by owning tsconfig
        const errorLines = captured
          .map((msg) =>
            stripAnsi(msg)
              .replace(/^\s*proc\s+\[tsc\]\s*/, '')
              .replace(/^([^\s(]+)\((\d+),(\d+)\)/, '$1:$2:$3')
              .trimEnd()
          )
          .filter((l) => l.includes('error TS'));

        const errorsByProject = new Map<string, string[]>();
        for (const errorLine of errorLines) {
          const fileMatch = errorLine.match(/^([^\s:]+):\d+:\d+/);
          let tsconfig = '';
          if (fileMatch) {
            let dir = Path.dirname(Path.resolve(REPO_ROOT, fileMatch[1]));
            while (dir !== REPO_ROOT && dir !== Path.dirname(dir)) {
              if (existsSync(Path.join(dir, 'tsconfig.json'))) {
                tsconfig = Path.relative(REPO_ROOT, Path.join(dir, 'tsconfig.json'));
                break;
              }
              dir = Path.dirname(dir);
            }
          }
          const list = errorsByProject.get(tsconfig) ?? [];
          list.push(errorLine);
          errorsByProject.set(tsconfig, list);
        }

        writeln('');
        for (const [tsconfig, tscErrors] of errorsByProject) {
          for (const errorLine of tscErrors) {
            writeln(`    ${errorLine}`);
          }
          writeln(
            tsconfig
              ? `    → node scripts/type_check --project ${tsconfig}`
              : `    → node scripts/type_check --profile quick`
          );
          writeln('');
        }

        if (errorsByProject.size === 0) {
          writeln(`    → node scripts/type_check --profile quick`);
          writeln('');
        }
        errors.push(error instanceof Error ? error : new Error(String(error)));
      } finally {
        await procRunner.teardown();
      }
    }

    if (errors.length > 0) {
      process.exitCode = 1;
    }
  },
  {
    description: `
      Run type_check, eslint, and jest with one shared validation contract.

      Defaults to --profile quick when no validation flags are provided.
    `,
    flags: {
      string: [...VALIDATION_RUN_STRING_FLAGS],
      boolean: ['fix'],
      default: {
        fix: true,
      },
      help: `
${VALIDATION_RUN_HELP}
      --no-fix               Disable lint auto-fix
      `,
    },
  }
);
