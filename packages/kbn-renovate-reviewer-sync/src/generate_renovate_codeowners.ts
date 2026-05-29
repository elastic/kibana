/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve as pathResolve, join, extname } from 'path';
import { cpus } from 'os';

import chalk from 'chalk';
import { modify, applyEdits } from 'jsonc-parser';

import { REPO_ROOT } from '@kbn/repo-info';

import type { RenovateConfig, ReviewerSyncReport } from './reviewer_sync';
import { syncReviewersInConfig } from './reviewer_sync';
import type { WorkerPoolLike } from './worker_pool';
import { WorkerPool } from './worker_pool';

const PACKAGE_JSON_FILENAME = 'package.json';
const RENOVATE_CONFIG_FILENAME = 'renovate.json';
const CODE_OWNERS_RELATIVE_PATH = '.github/CODEOWNERS';

/** File extensions to scan for imports. */
export const SCAN_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx'];

/** Source directories scanned for imports. Anything outside is ignored. */
export const SCAN_PREFIXES: readonly string[] = ['src/', 'x-pack/', 'packages/'];

/**
 * Number of files dispatched per worker IPC round-trip. Larger values amortize
 * `postMessage` / structured-clone overhead more aggressively but worsen load
 * balancing if some files are much slower to scan than others. 200 keeps the
 * per-batch cost dwarfing the IPC cost while leaving dozens of batches per
 * worker on a Kibana-sized tree — plenty of granularity for
 * pickup-as-free scheduling across the pool.
 */
export const WORKER_BATCH_SIZE = 200;

/**
 * `git grep -l -E` patterns used to pre-filter the file set before dispatching
 * to workers. Tuned to match `import`/`require`/`export from` keywords with a
 * left word boundary so they don't match identifiers that happen to contain
 * those substrings.
 *
 * The three alternatives are passed to `git grep` as a single combined regex
 * (joined with `|`) so the working tree is scanned once instead of three
 * times. Exported as the individual patterns so tests can assert the shape.
 */
export const GREP_PATTERNS: readonly string[] = [
  '(^|[^a-zA-Z0-9_])import',
  '(^|[^a-zA-Z0-9_])require\\(',
  '(^|[^a-zA-Z0-9_])export.*[^a-zA-Z0-9_]from([^a-zA-Z0-9_]|$)',
  '(^|[^a-zA-Z0-9_])}[[:space:]]*from[[:space:]]*[\'"]',
];

/** Predicate: is this file in a scanned directory and a scanned extension? */
export function shouldScanFile(file: string): boolean {
  if (!file) return false;
  if (!SCAN_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  return SCAN_EXTENSIONS.includes(extname(file));
}

/**
 * Format the diagnostic header for a rule. When `groupName` is present we use
 * it as the human-stable identifier and drop the array index — the name is
 * what a reader greps for in `renovate.json` anyway, and indices shift as the
 * file is edited. Falls back to `rule[N]` only when the rule has no name, so
 * the entry remains locatable.
 */
export function formatRuleHeader(item: { index: number; groupName?: string }): string {
  return item.groupName ? `"${item.groupName}"` : `rule[${item.index}]`;
}

/**
 * Compute the symmetric difference between two reviewer team lists for drift
 * diagnostics. Returns `added` (in `after` only), `removed` (in `before` only),
 * and `kept` (in both) so callers can render a complete picture where
 * `before.length === kept.length + removed.length` and `after.length === kept.length + added.length`.
 *
 * Returned arrays preserve the order from the source arrays so downstream print
 * stays stable — `before`/`after` are already sorted+unique by
 * `normalizeSortedUnique` in `reviewer_sync.ts`, so the result is sorted too.
 */
export function diffTeamSets(
  before: readonly string[],
  after: readonly string[]
): { added: string[]; removed: string[]; kept: string[] } {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter((t) => !beforeSet.has(t)),
    removed: before.filter((t) => !afterSet.has(t)),
    kept: after.filter((t) => beforeSet.has(t)),
  };
}

/**
 * Apply only the managed reviewer changes back into the original `renovate.json`
 * text, preserving the file's existing hand-maintained formatting.
 *
 * A full `JSON.parse` -> `JSON.stringify(..., null, 2)` round-trip rewrites the
 * whole file (the source keeps many arrays compact on one line; pretty-printing
 * expands them all), which would turn every no-op scan into a formatting-only
 * diff and trip the weekly job's `git diff --quiet renovate.json` gate. Instead
 * we surgically replace just the `packageRules[i].reviewers` arrays that changed,
 * via `jsonc-parser` edits, leaving every other byte untouched.
 *
 * Pure (text in, text out) so it can be unit-tested without touching disk.
 */
export function applyReviewerEditsToConfigText(
  originalText: string,
  managedRuleDrift: ReviewerSyncReport['managedRuleDrift']
): string {
  let text = originalText;
  for (const { index, after } of managedRuleDrift) {
    const edits = modify(text, ['packageRules', index, 'reviewers'], after, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    });
    text = applyEdits(text, edits);
  }
  return text;
}

/**
 * Pure helper: derive the set of npm package names this repo depends on.
 * Excludes internal `@kbn/*` packages (their ownership is computed differently).
 *
 * Accepts a parsed `package.json` (any-shaped) so the caller controls I/O.
 */
export function getAllPackages(packageJson: unknown): string[] {
  if (!packageJson || typeof packageJson !== 'object') return [];

  const pkg = packageJson as Partial<{
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
  }>;

  const allPackages = new Set<string>();
  for (const deps of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (!name.startsWith('@kbn/')) {
        allPackages.add(name);
      }
    }
  }

  return Array.from(allPackages).sort();
}

/**
 * Default file-discovery: runs a single `git grep -l -E "<combined>"` under
 * `repoRoot`, restricted to scanned extensions, and returns the paths that
 * live inside the scanned directory prefixes.
 *
 * Patterns that match nothing make `git grep` exit with status 1 — that's
 * expected and treated as "no files" rather than a failure. Other git failures
 * reject so a bad `repoRoot` can't silently look like an empty scan.
 *
 * Streaming rather than buffered: `git grep` emits matching paths as it walks
 * the tree, so `onProgress` fires with a running total as lines arrive. That
 * gives the orchestrator something to render during a scan that can take a
 * few seconds on a large repo.
 */
export function discoverFilesViaGitGrep(
  repoRoot: string,
  onProgress?: (foundCount: number) => void
): Promise<string[]> {
  return new Promise((resolvePromise, rejectPromise) => {
    const filesWithImports = new Set<string>();
    const combinedPattern = GREP_PATTERNS.join('|');
    const extArgs = SCAN_EXTENSIONS.map((ext) => `*${ext}`);

    const child = spawn('git', ['grep', '-l', '-E', combinedPattern, '--', ...extArgs], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Line-boundary aware buffering: stdout chunks don't align with newlines,
    // so we keep a trailing partial line in `pending` until the next chunk
    // completes it. Dropping that would silently lose the last file on every
    // chunk boundary.
    let pending = '';
    let stderr = '';
    let settled = false;

    const flushLine = (line: string) => {
      if (!line) return;
      if (shouldScanFile(line)) {
        filesWithImports.add(line);
      }
    };

    const settleWithError = (error: Error) => {
      // `error` and `close` can both fire (error → process dies → close).
      // Guard so we only settle once; a Promise ignores extra settles but
      // the idempotency keeps the intent explicit.
      if (settled) return;
      settled = true;
      rejectPromise(error);
    };

    const settleWithResult = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      if (exitCode !== null && exitCode > 1) {
        const detail = stderr.trim();
        rejectPromise(
          new Error(`git grep failed with exit code ${exitCode}${detail ? `: ${detail}` : ''}`)
        );
        return;
      }
      if (pending) flushLine(pending);
      pending = '';
      resolvePromise(Array.from(filesWithImports));
    };

    child.stdout.on('data', (chunk: Buffer) => {
      pending += chunk.toString('utf8');
      let nl = pending.indexOf('\n');
      while (nl !== -1) {
        flushLine(pending.slice(0, nl));
        pending = pending.slice(nl + 1);
        nl = pending.indexOf('\n');
      }
      if (onProgress) onProgress(filesWithImports.size);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', settleWithError);
    child.on('close', settleWithResult);
  });
}

/** Logger surface this module needs. Matches `@kbn/dev-cli-runner`'s ToolingLog. */
export interface GenerateRenovateCodeownersLog {
  info: (...args: any[]) => void;
  success: (...args: any[]) => void;
  write: (...args: any[]) => void;
  verbose: (...args: any[]) => void;
}

export type GenerateRenovateCodeownersMode = 'dry-run' | 'write' | 'check';

/**
 * Runtime-enumerable set of valid modes. Kept in sync with
 * `GenerateRenovateCodeownersMode`. Used both for the orchestrator's runtime
 * validation and for tests / programmatic callers that want to enumerate the
 * accepted modes without duplicating the literal list.
 */
export const GENERATE_RENOVATE_CODEOWNERS_MODES: readonly GenerateRenovateCodeownersMode[] = [
  'dry-run',
  'write',
  'check',
];

export interface GenerateRenovateCodeownersOptions {
  mode: GenerateRenovateCodeownersMode;
  reportJsonPath?: string;
}

/**
 * Dependency-injection seams for `generateRenovateCodeowners`. Every field is
 * optional and defaults to the production implementation, so the CLI can call
 * `generateRenovateCodeowners(log, options)` unchanged.
 *
 * Tests typically inject `repoRoot`, `discoverFiles`, `createWorkerPool`,
 * `setExitCode`, and `installSignalHandlers: false` to keep the run hermetic.
 */
export interface GenerateRenovateCodeownersDeps {
  /** Repo root for resolving package.json / renovate.json / CODEOWNERS. Defaults to `REPO_ROOT`. */
  repoRoot?: string;
  /**
   * Discover candidate files (relative to `repoRoot`). Defaults to
   * `discoverFilesViaGitGrep(repoRoot, onProgress)`. May be sync (for tests
   * with fixed file lists) or async (for real scans). When async, `onProgress`
   * is called with the running file count so the orchestrator can render
   * live feedback — during a scan that can take a few seconds on a large
   * repo, the spinner-equivalent would otherwise just be a silent pause.
   */
  discoverFiles?: (onProgress?: (foundCount: number) => void) => string[] | Promise<string[]>;
  /** Build a worker pool. Defaults to a real `worker_threads`-backed pool loading `worker.js`. */
  createWorkerPool?: (params: {
    workerCount: number;
    repoRoot: string;
    codeOwnersPath: string;
  }) => WorkerPoolLike;
  /** Worker count override. Defaults to `max(1, cpus - 1)`. */
  workerCount?: number;
  /** Read a UTF-8 file. Defaults to `fs.readFileSync(path, 'utf8')`. */
  readFile?: (filePath: string) => string;
  /** Write a UTF-8 file. Defaults to `fs.writeFileSync(path, contents, 'utf8')`. */
  writeFile?: (filePath: string, contents: string) => void;
  /** Set the process exit code. Defaults to setting `process.exitCode = code`. */
  setExitCode?: (code: number) => void;
  /**
   * Install process-level signal + uncaught handlers for graceful shutdown.
   * Defaults to `true`; tests should pass `false` to keep the test runner clean.
   */
  installSignalHandlers?: boolean;
}

const defaultReadFile = (filePath: string) => readFileSync(filePath, 'utf8');
const defaultWriteFile = (filePath: string, contents: string) =>
  writeFileSync(filePath, contents, 'utf8');
const defaultSetExitCode = (code: number) => {
  process.exitCode = code;
};
// Default to one fewer than physical cores: workers are CPU-bound (regex +
// trie lookups) AND I/O-bound (file reads via libuv), so leaving one core for
// the orchestrator + libuv reactor keeps the system responsive without
// undersubscribing.
const defaultWorkerCount = () => Math.max(1, cpus().length - 1);

// libuv's threadpool defaults to 4 threads per worker; that bottlenecks the
// async `readFile` path inside each worker (worker concurrency is 16, so
// reads queue 4-deep in libuv before any forward progress). Setting this
// here works because (a) `process.env` is shared across worker_threads,
// (b) libuv reads `UV_THREADPOOL_SIZE` when it initializes, which happens
// on worker spawn — i.e. AFTER `defaultCreateWorkerPool` runs. We only set
// it when unset so users can still cap it explicitly via the environment.
const ensureLibuvThreadpool = () => {
  if (!process.env.UV_THREADPOOL_SIZE) {
    process.env.UV_THREADPOOL_SIZE = '16';
  }
};

const defaultCreateWorkerPool: NonNullable<GenerateRenovateCodeownersDeps['createWorkerPool']> = ({
  workerCount,
  repoRoot,
  codeOwnersPath,
}) => {
  ensureLibuvThreadpool();
  const workerPath = pathResolve(__dirname, 'worker.js');
  return new WorkerPool(workerCount, workerPath, { repoRoot, codeOwnersPath });
};

export async function generateRenovateCodeowners(
  log: GenerateRenovateCodeownersLog,
  options: GenerateRenovateCodeownersOptions,
  deps: GenerateRenovateCodeownersDeps = {}
): Promise<void> {
  const repoRoot = deps.repoRoot ?? REPO_ROOT;
  const readFile = deps.readFile ?? defaultReadFile;
  const writeFile = deps.writeFile ?? defaultWriteFile;
  const setExitCode = deps.setExitCode ?? defaultSetExitCode;
  const installSignalHandlers = deps.installSignalHandlers ?? true;
  const workerCount = deps.workerCount ?? defaultWorkerCount();
  const createWorkerPool = deps.createWorkerPool ?? defaultCreateWorkerPool;
  const discoverFiles =
    deps.discoverFiles ?? ((onProgress) => discoverFilesViaGitGrep(repoRoot, onProgress));

  // Runtime-validate the mode. The TS type `GenerateRenovateCodeownersMode`
  // guards compile-time callers, but a JS caller or anything reaching us via
  // `any` could slip an unknown string through — which would silently fall
  // into `dry-run` semantics (`applyChanges = mode === 'write'`). Fail loudly
  // instead so the bug surfaces at the boundary.
  if (!GENERATE_RENOVATE_CODEOWNERS_MODES.includes(options.mode)) {
    throw new Error(
      `Invalid mode "${String(
        options.mode
      )}". Expected one of: ${GENERATE_RENOVATE_CODEOWNERS_MODES.join(', ')}.`
    );
  }

  // Runtime-validate workerCount so bad input (0, NaN, negatives, non-integers)
  // errors out here with a targeted message instead of deferring to a
  // downstream "All worker threads have died" once `WorkerPool` is built with
  // an empty workers array.
  if (!Number.isInteger(workerCount) || workerCount < 1) {
    throw new Error(
      `Invalid workerCount ${String(workerCount)}. Expected a positive integer (>= 1).`
    );
  }

  const packageJsonPath = join(repoRoot, PACKAGE_JSON_FILENAME);
  const renovateConfigPath = join(repoRoot, RENOVATE_CONFIG_FILENAME);
  const codeOwnersPath = join(repoRoot, CODE_OWNERS_RELATIVE_PATH);

  const mode = options.mode;
  const applyChanges = mode === 'write';

  // Phase-level timings surface at `--verbose`. The flag is advertised by
  // `@kbn/dev-cli-runner` regardless of usage, so we give it something real
  // to show — otherwise the listing in `--help` is a lie. Kept at `verbose`
  // (not `info`) so the default output stays uncluttered.
  const totalStartedMs = Date.now();

  log.info(`🔍 Syncing renovate.json reviewers based on actual code usage...\n`);

  const packageJson: unknown = JSON.parse(readFile(packageJsonPath));
  const allPackages = getAllPackages(packageJson);
  log.info(`✓ Found ${allPackages.length} packages in package.json`);
  const knownPackages = new Set(allPackages);

  const packageToTeams = new Map<string, Set<string>>();
  for (const pkg of allPackages) {
    packageToTeams.set(pkg, new Set());
  }

  log.info(`\n🔍 Finding files with imports...`);

  // Live-tick the running file count while `git grep` streams paths. The scan
  // can take a few seconds on a large repo (~83k files → ~2s even after the
  // three-pattern collapse) and silence here was the user-visible pause that
  // motivated the streaming switch. `.unref()` so the tick never keeps the
  // event loop alive on its own.
  let discoveredCount = 0;
  const discoveryInterval = setInterval(() => {
    if (discoveredCount > 0) {
      log.write(`  Scanning... ${discoveredCount.toLocaleString()} files so far\r`);
    }
  }, 250);
  discoveryInterval.unref?.();

  const discoveryStartedMs = Date.now();
  let rawFiles: string[];
  try {
    rawFiles = await discoverFiles((n) => {
      discoveredCount = n;
    });
  } finally {
    clearInterval(discoveryInterval);
    // Erase the last spinner line so the subsequent `info` lines render
    // cleanly on their own row. The write is narrow-enough to not flicker.
    if (discoveredCount > 0) log.write(`\x1b[2K\r`);
  }
  const discoveryDurationMs = Date.now() - discoveryStartedMs;

  const filesArray = rawFiles.filter(shouldScanFile);
  const totalFiles = filesArray.length;

  log.info(`  Found ${totalFiles} files with imports`);
  log.info(`  Using ${workerCount} worker threads for parallel processing`);
  log.info(`  Processing ${totalFiles} files concurrently\n`);
  log.verbose(
    `⏱ Discovery: ${discoveryDurationMs}ms — ${rawFiles.length} raw match(es), ${totalFiles} after scan-scope filter`
  );

  let processedFiles = 0;
  const progressInterval = setInterval(() => {
    if (processedFiles > 0 && processedFiles < totalFiles) {
      log.write(`  Processed ${processedFiles}/${totalFiles} files...\r`);
    }
  }, 500);
  // Don't keep the event loop alive just for progress output.
  progressInterval.unref?.();

  let isShuttingDown = false;
  const cleanupHandlers: Array<() => void> = [];
  let workerPool: WorkerPoolLike | null = null;

  if (installSignalHandlers) {
    const cleanup = async () => {
      // Re-entry guard: SIGINT/SIGTERM/uncaught events can fire more than once
      // (e.g. the user hits Ctrl-C twice, or shutdown() throws and triggers
      // `unhandledRejection` → `uncaughtHandler` → `cleanup()` again). Without
      // this guard we'd recurse through shutdown on an already-drained pool.
      if (isShuttingDown) return;
      isShuttingDown = true;
      clearInterval(progressInterval);

      // Null out before awaiting shutdown so a second `cleanup()` call that
      // somehow bypasses the guard above (different async frame) can't call
      // shutdown() on the same pool twice.
      const poolToShutdown = workerPool;
      workerPool = null;
      if (poolToShutdown) {
        try {
          await poolToShutdown.shutdown();
        } catch {
          // Best-effort during signal-handler shutdown. If shutdown rejects we
          // still want to exit the process — letting the rejection bubble up
          // would re-enter `uncaughtHandler` and call `cleanup()` again.
        }
      }
      try {
        process.exit(1);
      } catch {
        process.kill(process.pid, 'SIGKILL');
      }
    };

    const signalHandler = (signal: string) => {
      log.write(`\n\n⚠️  Received ${signal}, shutting down gracefully...\n`);
      cleanup();
    };

    const uncaughtHandler = (error: unknown) => {
      // `uncaughtException` passes an `Error`, but `unhandledRejection` passes
      // the rejection reason (could be anything, including `null`/`undefined`).
      const message = error instanceof Error ? error.message : String(error);
      log.write(`\n\n❌ Uncaught exception: ${message}\n`);
      cleanup();
    };

    const exitHandler = () => {
      clearInterval(progressInterval);
    };

    process.on('SIGINT', signalHandler);
    process.on('SIGTERM', signalHandler);
    process.on('uncaughtException', uncaughtHandler);
    process.on('unhandledRejection', uncaughtHandler);
    process.on('exit', exitHandler);

    cleanupHandlers.push(() => {
      process.removeListener('SIGINT', signalHandler);
      process.removeListener('SIGTERM', signalHandler);
      process.removeListener('uncaughtException', uncaughtHandler);
      process.removeListener('unhandledRejection', uncaughtHandler);
      process.removeListener('exit', exitHandler);
    });
  }

  const processingStartedMs = Date.now();
  try {
    workerPool = createWorkerPool({ workerCount, repoRoot, codeOwnersPath });

    let actualProcessed = 0;
    let currentIndex = 0;

    // Unexpected per-task failures (worker crashes, postMessage errors, etc).
    // Legitimate per-file skips (no owner, oversize, stat failure) are reported by
    // worker.js as `{ success: true, skipped: true }` and never reach this catch,
    // so anything here means the scan data is partial and we must refuse to write.
    // Use a ref-style container so TypeScript's control-flow analysis doesn't
    // narrow the captured value to `never` after the async closures below.
    const failureState: { count: number; first: { file: string; error: unknown } | null } = {
      count: 0,
      first: null,
    };

    // Concurrent-loop pattern over the worker pool: keeps memory flat (no big
    // upfront `Promise.all([])` array of all file promises) by holding only a
    // small bounded set of in-flight promises at any time. Each loop pulls the
    // next BATCH (not single file) of work — IPC overhead is amortized across
    // `WORKER_BATCH_SIZE` files per round-trip.
    const workerLoops = Array(workerCount)
      .fill(null)
      .map(async () => {
        while (currentIndex < filesArray.length && !isShuttingDown && failureState.count === 0) {
          const batchStart = currentIndex;
          const batchEnd = Math.min(batchStart + WORKER_BATCH_SIZE, filesArray.length);
          currentIndex = batchEnd;

          const batch = [];
          for (let i = batchStart; i < batchEnd; i++) {
            const file = filesArray[i];
            batch.push({ filePath: pathResolve(repoRoot, file), relativePath: file });
          }

          let batchResults;
          try {
            batchResults = await workerPool!.processBatch(batch);
          } catch (error) {
            // Batch-level rejection (worker thread crash, pool shutdown,
            // all-workers-died, etc). Attribute to the first file in the batch
            // for the abort message; the whole batch is treated as failed.
            failureState.count += batch.length;
            const firstFile = batch[0]?.relativePath ?? '<empty batch>';
            if (failureState.first === null) {
              failureState.first = { file: firstFile, error };
            }
            log.write(
              `\n❌ Failed to process batch starting at ${firstFile}: ${
                error instanceof Error ? error.message : String(error)
              }\n`
            );
            continue;
          }

          for (const result of batchResults) {
            if (!result.success) {
              failureState.count++;
              if (failureState.first === null) {
                failureState.first = {
                  file: result.relativePath,
                  error: new Error(result.error ?? 'Unknown error'),
                };
              }
              log.write(
                `\n❌ Failed to process ${result.relativePath}: ${
                  result.error ?? 'Unknown error'
                }\n`
              );
              continue;
            }

            if (!result.skipped && result.imports && result.teams) {
              const { imports, teams } = result;
              for (const pkg of imports) {
                if (packageToTeams.has(pkg)) {
                  for (const team of teams) {
                    const teamWithPrefix = team.startsWith('@') ? team : `@${team}`;
                    packageToTeams.get(pkg)!.add(teamWithPrefix);
                  }
                }
              }
            }

            processedFiles++;
            actualProcessed++;
          }
        }
      });

    await Promise.all(workerLoops);

    if (failureState.first) {
      const { file: failedFile, error: failedError } = failureState.first;
      const detail = failedError instanceof Error ? failedError.message : String(failedError);
      throw new Error(
        `Aborting reviewer sync: failed to process ${failedFile}: ${detail}. ` +
          `Refusing to continue with partial scan data.`
      );
    }

    if (isShuttingDown) {
      log.write('\n⚠️  Processing was interrupted\n');
      setExitCode(1);
      return;
    }

    log.info(`\n✓ Processed ${actualProcessed} files`);

    const processingDurationMs = Date.now() - processingStartedMs;
    const filesPerSec =
      processingDurationMs > 0 ? Math.round((actualProcessed / processingDurationMs) * 1000) : 0;
    log.verbose(
      `⏱ Processing: ${processingDurationMs}ms — ${actualProcessed} files across ${workerCount} workers (${filesPerSec} files/sec)`
    );
  } finally {
    clearInterval(progressInterval);
    if (workerPool) {
      await workerPool.shutdown();
    }
    for (const cleanup of cleanupHandlers) {
      cleanup();
    }
  }

  const packageToTeamsArray = new Map<string, string[]>();
  let packagesWithUsage = 0;
  let packagesWithoutUsage = 0;

  for (const [pkg, teamsSet] of packageToTeams.entries()) {
    const teams = Array.from(teamsSet);
    packageToTeamsArray.set(pkg, teams);

    if (teams.length > 0) {
      packagesWithUsage++;
    } else {
      packagesWithoutUsage++;
    }
  }

  log.info(`✓ Found ${packagesWithUsage} packages used in code`);
  log.info(`✓ Found ${packagesWithoutUsage} packages not found in code\n`);

  const reportStartedMs = Date.now();
  const renovateConfigText = readFile(renovateConfigPath);
  const renovateConfig: RenovateConfig = JSON.parse(renovateConfigText);

  const report = syncReviewersInConfig({
    renovateConfig,
    knownPackages,
    packageToTeams: packageToTeamsArray,
    applyChanges,
  });
  const reportDurationMs = Date.now() - reportStartedMs;

  const reportOnlyDriftCount = report.ruleDrift.length;
  const missingCount = report.packagesUsedButNotCovered.length;

  log.info(`\n📊 Reviewer sync report:`);
  log.info(`   - Mode: ${mode}`);
  log.info(`   - Packages used in code (owned files): ${report.packagesUsedInCode}`);
  log.info(`   - Packages covered by explicit rules: ${report.packagesCoveredByRules}`);
  log.info(`   - Packages used but not covered by rules: ${missingCount}`);
  log.info(`   - Rules updated (or would be updated): ${report.updatedRules}`);
  log.info(`   - Rules with x_kbn_reviewer_sync.mode=fixed: ${report.rulesFixedByOverride}`);
  log.info(`   - Rules with x_kbn_reviewer_sync.mode=sync (managed): ${report.rulesSyncManaged}`);
  log.info(`   - Managed rules needing sync: ${report.managedSyncNeeded}`);
  log.info(
    `   - Report-only rules with drift (no x_kbn_reviewer_sync): ${report.reportOnlyRulesWithDrift}`
  );
  log.info(`   - Rules with no mappable packages: ${report.rulesWithNoMappablePackages}`);
  log.info(
    `   - Rules with no computed reviewers (left unchanged): ${report.rulesWithNoComputedReviewers}\n`
  );

  if (report.rulesWithNoComputedReviewersDetails.length > 0) {
    log.info(
      `⚠️  Rules where reviewers could not be computed from usage/CODEOWNERS (${report.rulesWithNoComputedReviewersDetails.length}):`
    );
    for (const item of report.rulesWithNoComputedReviewersDetails) {
      const packages = item.packages.join(', ');
      log.info(
        `   ❓ ${formatRuleHeader(item)} (${item.mode}) (${item.packages.length} pkgs): ${packages}`
      );
    }
    log.write('\n');
  }

  if (missingCount > 0) {
    log.info(
      `⚠️  Packages used in code but not covered by explicit package rules (${missingCount}):`
    );
    for (const pkg of report.packagesUsedButNotCovered) {
      log.info(`   📦 ${pkg}`);
    }
    log.write('\n');
  }

  if (reportOnlyDriftCount > 0) {
    log.info(`🔧 Reviewer drift detected for report-only rules (${reportOnlyDriftCount} rules):`);
    for (const item of report.ruleDrift) {
      const before = item.before ?? [];
      const { added, removed, kept } = diffTeamSets(before, item.after);
      log.info(
        `   🔸 ${formatRuleHeader(item)} (${item.packages.length} pkgs): ${before.length} -> ${
          item.after.length
        } teams`
      );
      if (added.length > 0) {
        log.info(chalk.green(`       + ${added.join(', ')}`));
      }
      if (removed.length > 0) {
        log.info(chalk.red(`       - ${removed.join(', ')}`));
      }
      if (kept.length > 0) {
        log.info(chalk.dim(`         ${kept.join(', ')}`));
      }
    }
    log.write('\n');
  }

  if (options.reportJsonPath) {
    writeFile(options.reportJsonPath, JSON.stringify(report, null, 2) + '\n');
    log.info(`📝 Wrote JSON report to ${options.reportJsonPath}`);
  }

  if (applyChanges) {
    // Format-preserving write: only rewrite the reviewer arrays that actually changed,
    // so a clean scan leaves renovate.json byte-identical and the weekly job's
    // `git diff --quiet` gate doesn't open formatting-only bot PRs.
    const updatedText = applyReviewerEditsToConfigText(renovateConfigText, report.managedRuleDrift);
    writeFile(renovateConfigPath, updatedText);
    log.success(`✅ Updated reviewers in ${renovateConfigPath}`);
  } else {
    log.success(`✅ Dry run complete (no files written)`);
  }

  log.verbose(`⏱ Report generation: ${reportDurationMs}ms`);
  log.verbose(`⏱ Total wall-clock: ${Date.now() - totalStartedMs}ms`);

  if (mode === 'check' && report.managedSyncNeeded > 0) {
    // Non-zero exit in check mode only for explicitly-managed rules.
    setExitCode(1);
  }
}
