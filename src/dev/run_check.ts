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
  let msg = detail ? `${detail} ...` : '...';

  const render = () => {
    write(`  ${pad(label)}${msg}`);
  };

  if (isTTY) {
    render();
  }

  const timer = isTTY
    ? setInterval(() => {
        clearLine();
        render();
        write(` ${formatDuration(Date.now() - start)}`);
      }, 1_000)
    : undefined;

  return {
    elapsed: () => formatDuration(Date.now() - start),
    setDetail: (detailText?: string) => {
      msg = detailText ? `${detailText} ...` : '...';
      if (isTTY) {
        clearLine();
        render();
      }
    },
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

// ── Header ──────────────────────────────────────────────────────────────────

const formatHeader = (baseContext: ValidationBaseContext) => {
  if (baseContext.mode === 'direct_target') {
    return `check  target=${baseContext.directTarget}`;
  }

  const { contract, runContext } = baseContext;

  if (runContext.kind === 'affected' && runContext.resolvedBase && contract.scope === 'branch') {
    const base = runContext.resolvedBase.baseRef;
    const sha = runContext.resolvedBase.base.slice(0, 12);
    const commits =
      runContext.branchCommitCount !== undefined ? `  ${runContext.branchCommitCount} commits` : '';
    return `check  branch  ${base} (${sha})..HEAD${commits}`;
  }

  return `check  scope=${contract.scope}`;
};

// ── Jest via Moon ───────────────────────────────────────────────────────────

const JEST_CONFIG_NAMES = [
  'jest.config.dev.js',
  'jest.config.js',
  'jest.config.cjs',
  'jest.config.mjs',
  'jest.config.ts',
  'jest.config.json',
] as const;

const TEST_FILE_RE = /\.(?:test|spec)\.(js|mjs|ts|tsx)$/;

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

const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

const findJestConfig = (testFilePath: string): string | undefined => {
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

interface MoonJestParseResult {
  tasks: MoonJestTaskResult[];
  parseFailures: string[];
}

const parseMoonJestOutput = (output: string): MoonJestParseResult => {
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

interface AffectedPackageInfo {
  dirs: string[];
  jestDirs: string[];
}

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
 * - maxWorkers never drops below 2
 * - Moon concurrency caps at 2
 */
const computeJestParallelism = (estimatedTasks: number) => {
  const cpus = Os.cpus().length;
  const safeEstimatedTasks = Math.max(1, estimatedTasks);
  const concurrency = Math.min(safeEstimatedTasks, 2);
  const maxWorkers = Math.max(2, Math.floor(cpus / concurrency));
  return { concurrency, maxWorkers };
};

interface JestPhaseResult {
  taskCount: number;
  cachedCount: number;
  totalTests: number;
  failed: MoonJestTaskResult[];
  exitCode: number;
  verboseDetail?: string;
  failureExcerpt?: string[];
  warnings?: string[];
}

interface JestPhaseProgress {
  completedCount: number;
}

const extractMoonFailureExcerpt = (output: string) => {
  return output
    .split('\n')
    .map((lineText) => stripAnsi(lineText).trim())
    .filter(Boolean)
    .filter((lineText) => !lineText.startsWith('{'))
    .slice(-8);
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

const runJestViaMoon = async (
  changedFiles: string[],
  verbose: boolean,
  downstream: string = 'none',
  onProgress?: (progress: JestPhaseProgress) => void
): Promise<JestPhaseResult | null> => {
  const packageInfo = await resolveAffectedPackageInfo(changedFiles);
  const changedFilesJson = JSON.stringify({ files: changedFiles });

  const execa = (await import('execa')).default;
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
  if (tasks.length === 0 && result.exitCode !== 0) {
    const warnings = [
      `Moon exited with code ${result.exitCode} but no Jest task output was parsed. ` +
        `The Jest task may have failed before producing JSON output — run jest directly to verify.`,
    ];
    if (parseFailures.length > 0) {
      warnings.push(...parseFailures);
    }

    const cachedCount = tasks.filter((t) => t.cached).length;
    const ranCount = tasks.length - cachedCount;

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
  }

  const warnings = parseFailures.length > 0 ? parseFailures : undefined;
  const cachedCount = tasks.filter((t) => t.cached).length;
  const ranCount = tasks.length - cachedCount;

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

const runJestTestsDirectly = async (
  testFiles: string[]
): Promise<{ testCount: number; passed: boolean; output: string }> => {
  const execa = (await import('execa')).default;
  const absolutePaths = testFiles.map((f) => Path.resolve(REPO_ROOT, f));

  const result = await execa(
    process.execPath,
    ['scripts/jest', '--runTestsByPath', ...absolutePaths, '--maxWorkers=2'],
    {
      cwd: REPO_ROOT,
      reject: false,
    }
  );

  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  const testsMatch = output.match(/Tests:\s+.*?(\d+) total/);
  const testCount = testsMatch ? parseInt(testsMatch[1], 10) : 0;

  return {
    testCount,
    passed: result.exitCode === 0,
    output,
  };
};

// ── Main ────────────────────────────────────────────────────────────────────

run(
  async ({ flagsReader }) => {
    const verbose = flagsReader.boolean('verbose');
    const fix = flagsReader.boolean('fix');
    const parsedValidationFlags = readValidationRunFlags(flagsReader);
    const hasValidationFlags = Object.values(parsedValidationFlags).some(
      (value) => value !== undefined
    );
    const validationFlags = hasValidationFlags
      ? parsedValidationFlags
      : { ...parsedValidationFlags, profile: 'quick' };

    const profile = validationFlags.profile ?? 'quick';
    if (isTTY) {
      write(`check  profile=${profile} ...`);
    }

    const warnings: string[] = [];
    const baseContext = await resolveValidationBaseContext({
      flags: validationFlags,
      runnerDescription: 'check',
      onWarning: (message) => warnings.push(message),
    });

    if (isTTY) {
      clearLine();
    }
    writeln(formatHeader(baseContext));
    for (const warning of warnings) {
      writeln(line('warn', '!', warning));
    }

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
        const result = await executeEslintValidation({ baseContext, log, fix });
        if (!result) {
          progress.writeResult(line('lint', '—', 'no files changed'));
        } else if (result.failedFiles.length > 0) {
          progress.writeResult(line('lint', '✗', 'failed', progress.elapsed()));
          if (captured.length > 0) {
            writeln('');
            for (const msg of captured) writeln(`    ${msg}`);
          }
          writeln(`    $ node scripts/eslint ${result.failedFiles.join(' ')}`);
          writeln('');
          errors.push(new Error('eslint failed'));
        } else {
          const notes: string[] = [];
          if (result.fixedFiles.length > 0) {
            notes.push(`fixed ${pluralize(result.fixedFiles.length, 'file')}`);
          }
          if (result.warningCount > 0) {
            notes.push(pluralize(result.warningCount, 'warning'));
          }
          const suffix = notes.length > 0 ? ` (${notes.join(', ')})` : '';
          progress.writeResult(
            line(
              'lint',
              result.warningCount > 0 ? '⚠' : '✓',
              `${pluralize(result.fileCount, 'file')}${suffix}`,
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
      } else if (
        changedFiles.every(isTestFile) &&
        (() => {
          // Fast path only safe when all test files share a single jest config.
          const configs = new Set(changedFiles.map(findJestConfig).filter(Boolean));
          return configs.size <= 1;
        })()
      ) {
        // Fast path: all changes are test files under one config — run them directly.
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
            const rerunCommand =
              changedFiles.length === 1
                ? `node scripts/jest ${changedFiles[0]}`
                : `node scripts/jest --runTestsByPath ${changedFiles.join(' ')}`;
            writeln(`    $ ${rerunCommand}`);
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
          const downstream =
            baseContext.mode === 'contract' ? baseContext.contract.downstream : 'none';
          const result = await runJestViaMoon(changedFiles, verbose, downstream, (progress) => {
            jestProgress.setDetail(`[${progress.completedCount} complete]`);
          });

          const printVerbose = () => {
            if (result?.warnings) {
              for (const warning of result.warnings) {
                writeln(line('warn', '!', warning));
              }
            }
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

          if (!result || (result.taskCount === 0 && result.exitCode === 0)) {
            jestProgress.writeResult(
              line('jest', '—', 'no affected configs', jestProgress.elapsed())
            );
            printVerbose();
          } else if (result.taskCount === 0) {
            jestProgress.writeResult(line('jest', '✗', 'failed', jestProgress.elapsed()));
            writeln('');
            for (const excerptLine of result.failureExcerpt ?? []) {
              writeln(`    ${excerptLine}`);
            }
            writeln('    $ node scripts/jest --profile quick');
            writeln('');
            printVerbose();
            errors.push(new Error('jest failed'));
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
              writeln(`    $ ${jestCmd}`);
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
          cleanup: true,
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
            while (true) {
              if (existsSync(Path.join(dir, 'tsconfig.json'))) {
                tsconfig = Path.relative(REPO_ROOT, Path.join(dir, 'tsconfig.json'));
                break;
              }
              if (dir === REPO_ROOT || dir === Path.dirname(dir)) {
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
              ? `    $ node scripts/type_check --project ${tsconfig}`
              : `    $ node scripts/type_check --profile quick`
          );
          writeln('');
        }

        if (errorsByProject.size === 0) {
          writeln(`    $ node scripts/type_check --profile quick`);
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

      Examples:
        node scripts/check --scope local
        node scripts/check --profile agent
        node scripts/check --scope branch --base-ref origin/main
    `,
    flags: {
      string: [...VALIDATION_RUN_STRING_FLAGS],
      boolean: ['fix'],
      default: {
        fix: true,
      },
      help: [...VALIDATION_RUN_HELP, { flag: '--no-fix', description: 'Disable lint auto-fix' }],
    },
  }
);
