/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve as pathResolve, join, extname } from 'path';
import { cpus } from 'os';

import { REPO_ROOT } from '@kbn/repo-info';

import type { RenovateConfig } from './reviewer_sync';
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
 * balancing if some files are much slower to scan than others. 200 is a balance:
 * with ~83k files and 6 workers that's ~70 batches per worker, plenty of
 * granularity for pickup-as-free scheduling.
 */
export const WORKER_BATCH_SIZE = 200;

/**
 * `git grep -l -E` patterns used to pre-filter the file set before dispatching
 * to workers. Tuned to match `import`/`require`/`export from` keywords with a
 * left word boundary so they don't match identifiers that happen to contain
 * those substrings.
 */
export const GREP_PATTERNS: readonly string[] = [
  '(^|[^a-zA-Z0-9_])import',
  '(^|[^a-zA-Z0-9_])require\\(',
  '(^|[^a-zA-Z0-9_])export.*[^a-zA-Z0-9_]from([^a-zA-Z0-9_]|$)',
];

/** Predicate: is this file in a scanned directory and a scanned extension? */
export function shouldScanFile(file: string): boolean {
  if (!file) return false;
  if (!SCAN_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  return SCAN_EXTENSIONS.includes(extname(file));
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
 * Default file-discovery: runs `git grep -l` once per import pattern under
 * `repoRoot`, restricted to scanned extensions, and returns the union of paths
 * inside the scanned directory prefixes.
 *
 * Patterns that match nothing make `git grep` exit non-zero — that's expected
 * and treated as "no files" rather than a failure.
 */
export function discoverFilesViaGitGrep(repoRoot: string): string[] {
  const filesWithImports = new Set<string>();
  const extArgs = SCAN_EXTENSIONS.map((ext) => `"*${ext}"`).join(' ');

  for (const pattern of GREP_PATTERNS) {
    try {
      const grepFiles = execSync(`git grep -l -E "${pattern}" -- ${extArgs}`, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 20 * 1024 * 1024,
      });

      grepFiles
        .toString()
        .trim()
        .split('\n')
        .forEach((f) => {
          if (shouldScanFile(f)) {
            filesWithImports.add(f);
          }
        });
    } catch {
      // git grep returns non-zero when nothing matches — not a failure.
    }
  }

  return Array.from(filesWithImports);
}

/** Logger surface this module needs. Matches `@kbn/dev-cli-runner`'s ToolingLog. */
export interface GenerateRenovateCodeownersLog {
  info: (...args: any[]) => void;
  success: (...args: any[]) => void;
  write: (...args: any[]) => void;
}

export type GenerateRenovateCodeownersMode = 'dry-run' | 'write' | 'check';

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
  /** Discover candidate files (relative to `repoRoot`). Defaults to `discoverFilesViaGitGrep(repoRoot)`. */
  discoverFiles?: () => string[];
  /** Build a worker pool. Defaults to a real `worker_threads`-backed pool loading `worker.js`. */
  createWorkerPool?: (params: {
    workerCount: number;
    repoRoot: string;
    codeOwnersPath: string;
  }) => WorkerPoolLike;
  /** Worker count override. Defaults to `min(cpus-1, 6)`. */
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
const defaultWorkerCount = () => Math.min(Math.max(1, cpus().length - 1), 6);
const defaultCreateWorkerPool: NonNullable<GenerateRenovateCodeownersDeps['createWorkerPool']> = ({
  workerCount,
  repoRoot,
  codeOwnersPath,
}) => {
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
  const discoverFiles = deps.discoverFiles ?? (() => discoverFilesViaGitGrep(repoRoot));

  const packageJsonPath = join(repoRoot, PACKAGE_JSON_FILENAME);
  const renovateConfigPath = join(repoRoot, RENOVATE_CONFIG_FILENAME);
  const codeOwnersPath = join(repoRoot, CODE_OWNERS_RELATIVE_PATH);

  const mode = options.mode;
  const applyChanges = mode === 'write';

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

  const filesArray = discoverFiles().filter(shouldScanFile);
  const totalFiles = filesArray.length;

  log.info(`  Found ${totalFiles} files with imports`);
  log.info(`  Using ${workerCount} worker threads for parallel processing`);
  log.info(`  Processing ${totalFiles} files concurrently\n`);

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
      isShuttingDown = true;
      clearInterval(progressInterval);
      if (workerPool) {
        await workerPool.shutdown();
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

  const renovateConfig: RenovateConfig = JSON.parse(readFile(renovateConfigPath));

  const report = syncReviewersInConfig({
    renovateConfig,
    knownPackages,
    packageToTeams: packageToTeamsArray,
    applyChanges,
  });

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
    const preview = report.rulesWithNoComputedReviewersDetails.slice(0, 25);
    log.info(
      `⚠️  Rules where reviewers could not be computed from usage/CODEOWNERS (first ${preview.length}):`
    );
    for (const item of preview) {
      const packages = item.packages.join(', ');
      log.info(
        `   - rule[${item.index}] (${item.mode}) (${item.packages.length} pkgs): ${packages}`
      );
    }
    if (report.rulesWithNoComputedReviewersDetails.length > preview.length) {
      log.info(
        `   ... and ${report.rulesWithNoComputedReviewersDetails.length - preview.length} more`
      );
    }
    log.write('\n');
  }

  if (missingCount > 0) {
    const preview = report.packagesUsedButNotCovered.slice(0, 50);
    log.info(
      `⚠️  Packages used in code but not covered by explicit package rules (first ${preview.length}):`
    );
    for (const pkg of preview) {
      log.info(`   - ${pkg}`);
    }
    if (missingCount > preview.length) {
      log.info(`   ... and ${missingCount - preview.length} more`);
    }
    log.write('\n');
  }

  if (reportOnlyDriftCount > 0) {
    const preview = report.ruleDrift.slice(0, 25);
    log.info(`🔧 Reviewer drift detected for report-only rules (first ${preview.length} rules):`);
    for (const item of preview) {
      log.info(
        `   - rule[${item.index}] (${item.packages.length} pkgs): ${item.before ?? []} -> ${
          item.after
        }`
      );
    }
    if (reportOnlyDriftCount > preview.length) {
      log.info(`   ... and ${reportOnlyDriftCount - preview.length} more`);
    }
    log.write('\n');
  }

  if (options.reportJsonPath) {
    writeFile(options.reportJsonPath, JSON.stringify(report, null, 2) + '\n');
    log.info(`📝 Wrote JSON report to ${options.reportJsonPath}`);
  }

  if (applyChanges) {
    writeFile(renovateConfigPath, JSON.stringify(renovateConfig, null, 2) + '\n');
    log.success(`✅ Updated reviewers in ${renovateConfigPath}`);
  } else {
    log.success(`✅ Dry run complete (no files written)`);
  }

  if (mode === 'check' && report.managedSyncNeeded > 0) {
    // Non-zero exit in check mode only for explicitly-managed rules.
    setExitCode(1);
  }
}
