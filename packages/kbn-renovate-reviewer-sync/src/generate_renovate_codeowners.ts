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
import { Worker } from 'worker_threads';
import { cpus } from 'os';

import { REPO_ROOT } from '@kbn/repo-info';

import type { RenovateConfig } from './reviewer_sync';
import { syncReviewersInConfig } from './reviewer_sync';

const PACKAGE_JSON_PATH = join(REPO_ROOT, 'package.json');
const RENOVATE_CONFIG_PATH = join(REPO_ROOT, 'renovate.json');
const CODE_OWNERS_PATH = join(REPO_ROOT, '.github/CODEOWNERS');

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Get all packages from package.json
 */
function getAllPackages(): string[] {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const allPackages = new Set<string>();

  // Collect from dependencies, devDependencies, and peerDependencies
  for (const deps of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
  ]) {
    if (deps) {
      for (const pkg of Object.keys(deps)) {
        // Skip @kbn/* packages (internal packages)
        if (!pkg.startsWith('@kbn/')) {
          allPackages.add(pkg);
        }
      }
    }
  }

  return Array.from(allPackages).sort();
}

/**
 * Worker pool for processing files in parallel using worker threads
 * This allows true CPU parallelism across multiple cores
 */
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private activeTasks = new Map<
    Worker,
    {
      filePath: string;
      relativePath: string;
      resolve: (value: {
        relativePath: string;
        imports: string[];
        teams: string[];
        skipped?: boolean;
      }) => void;
      reject: (error: Error) => void;
    }
  >();
  private pendingTasks: Array<{
    filePath: string;
    relativePath: string;
    resolve: (value: {
      relativePath: string;
      imports: string[];
      teams: string[];
      skipped?: boolean;
    }) => void;
    reject: (error: Error) => void;
  }> = [];
  private isShuttingDown = false;

  constructor(workerCount: number, workerPath: string, workerData: any) {
    // Create worker pool (one per CPU core)
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerPath, { workerData });
      this.workers.push(worker);
      this.availableWorkers.push(worker);

      // Handle worker messages
      worker.on(
        'message',
        (result: {
          relativePath: string;
          imports?: string[];
          teams?: string[];
          skipped?: boolean;
          success: boolean;
          error?: string;
        }) => {
          const task = this.activeTasks.get(worker);
          if (task) {
            this.activeTasks.delete(worker);
            this.availableWorkers.push(worker);

            if (result.success) {
              task.resolve({
                relativePath: result.relativePath,
                imports: result.imports || [],
                teams: result.teams || [],
                skipped: result.skipped,
              });
            } else {
              task.reject(new Error(result.error || 'Unknown error'));
            }

            // Process next pending task
            this.processNextTask();
          }
        }
      );

      worker.on('error', (error) => {
        const task = this.activeTasks.get(worker);
        if (task) {
          this.activeTasks.delete(worker);
          this.availableWorkers.push(worker);
          task.reject(error);
          this.processNextTask();
        }
      });
    }
  }

  private processNextTask(): void {
    if (
      this.isShuttingDown ||
      this.pendingTasks.length === 0 ||
      this.availableWorkers.length === 0
    ) {
      return;
    }

    const task = this.pendingTasks.shift()!;
    const worker = this.availableWorkers.pop()!;

    this.activeTasks.set(worker, task);

    worker.postMessage({
      filePath: task.filePath,
      relativePath: task.relativePath,
    });
  }

  async processFile(
    filePath: string,
    relativePath: string
  ): Promise<{
    relativePath: string;
    imports: string[];
    teams: string[];
    skipped?: boolean;
  }> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    return new Promise((resolve, reject) => {
      this.pendingTasks.push({ filePath, relativePath, resolve, reject });
      this.processNextTask();
    });
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Reject all pending tasks
    for (const task of this.pendingTasks) {
      task.reject(new Error('Worker pool shutdown'));
    }
    this.pendingTasks = [];

    // Reject all active tasks
    for (const task of this.activeTasks.values()) {
      task.reject(new Error('Worker pool shutdown'));
    }
    this.activeTasks.clear();

    // Terminate all workers
    await Promise.all(
      this.workers.map(
        (worker) =>
          new Promise<void>((resolve) => {
            worker.terminate().then(() => resolve());
            // Force resolve after timeout
            setTimeout(() => resolve(), 1000);
          })
      )
    );
  }
}

/**
 * Main execution
 */
export type GenerateRenovateCodeownersMode = 'dry-run' | 'write' | 'check';

export async function generateRenovateCodeowners(
  log: {
    info: (...args: any[]) => void;
    success: (...args: any[]) => void;
    write: (...args: any[]) => void;
  },
  options: {
    mode: GenerateRenovateCodeownersMode;
    reportJsonPath?: string;
  }
): Promise<void> {
  const mode = options.mode;
  const applyChanges = mode === 'write';

  log.info(`🔍 Syncing renovate.json reviewers based on actual code usage...\n`);

  // Get all packages from package.json
  const allPackages = getAllPackages();
  log.info(`✓ Found ${allPackages.length} packages in package.json`);
  const knownPackages = new Set(allPackages);

  // Map packages to teams based on where they're imported
  const packageToTeams = new Map<string, Set<string>>();

  // Initialize all packages
  for (const pkg of allPackages) {
    packageToTeams.set(pkg, new Set());
  }

  log.info(`\n🔍 Finding files with imports...`);

  // Use git grep to find files that contain import/require/export statements
  // This is much faster than processing all files, though it might miss some complex multiline cases
  const filesWithImports = new Set<string>();

  const grepPatterns = [
    '(^|[^a-zA-Z0-9_])import', // Matches "import" keyword with boundary
    '(^|[^a-zA-Z0-9_])require\\(', // Matches "require(" with boundary
    '(^|[^a-zA-Z0-9_])export.*[^a-zA-Z0-9_]from([^a-zA-Z0-9_]|$)', // Matches "export ... from" with boundaries
  ];

  for (const pattern of grepPatterns) {
    try {
      const grepFiles = execSync(`git grep -l -E "${pattern}" -- "*.ts" "*.tsx" "*.js" "*.jsx"`, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 20 * 1024 * 1024,
      });

      grepFiles
        .toString()
        .trim()
        .split('\n')
        .forEach((f) => {
          if (f && (f.startsWith('src/') || f.startsWith('x-pack/') || f.startsWith('packages/'))) {
            filesWithImports.add(f);
          }
        });
    } catch (error) {
      // No matches for this pattern - that's ok
    }
  }

  log.info(`  Found ${filesWithImports.size} files with imports`);

  // Use Worker Threads for true CPU parallelism
  // Process all files efficiently without batching barriers
  const totalFiles = filesWithImports.size;

  // Limit max workers to 6 to avoid excessive memory usage (each worker loads CODEOWNERS)
  // This prevents OS swapping on machines with 16GB RAM while still providing parallelism
  const WORKER_COUNT = Math.min(Math.max(1, cpus().length - 1), 6);

  log.info(`  Using ${WORKER_COUNT} worker threads for parallel processing`);
  log.info(`  Processing ${totalFiles} files concurrently\n`);

  // Convert Set to array and filter by extension
  const filesArray = Array.from(filesWithImports).filter((file) =>
    SCAN_EXTENSIONS.includes(extname(file))
  );

  // Track progress
  let processedFiles = 0;
  const progressInterval = setInterval(() => {
    if (processedFiles > 0 && processedFiles < totalFiles) {
      log.write(`  Processed ${processedFiles}/${totalFiles} files...\r`);
    }
  }, 500);

  // Cleanup handler
  let isShuttingDown = false;
  const cleanupHandlers: Array<() => void> = [];
  let workerPool: WorkerPool | null = null;

  const setupCleanupHandlers = () => {
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

    process.on('SIGINT', signalHandler);
    process.on('SIGTERM', signalHandler);

    const uncaughtHandler = (error: Error) => {
      log.write(`\n\n❌ Uncaught exception: ${error.message}\n`);
      cleanup();
    };

    process.on('uncaughtException', uncaughtHandler);
    process.on('unhandledRejection', uncaughtHandler);
    process.on('exit', () => {
      clearInterval(progressInterval);
    });

    cleanupHandlers.push(() => {
      process.removeListener('SIGINT', signalHandler);
      process.removeListener('SIGTERM', signalHandler);
      process.removeListener('uncaughtException', uncaughtHandler);
      process.removeListener('unhandledRejection', uncaughtHandler);
    });
  };

  setupCleanupHandlers();

  try {
    // Create worker pool
    // Use the JS version of the worker (worker threads need plain JS, not TS)
    const workerPath = pathResolve(__dirname, 'worker.js');
    // Pass initialization data to workers
    const workerData = {
      repoRoot: REPO_ROOT,
      codeOwnersPath: CODE_OWNERS_PATH,
    };
    workerPool = new WorkerPool(WORKER_COUNT, workerPath, workerData);

    let actualProcessed = 0;

    let currentIndex = 0;

    // Use a "concurrent loop" pattern to feed the worker pool
    // This keeps the memory usage flat (low) and prevents GC thrashing
    // by only maintaining a small buffer of active promises.
    const workerLoops = Array(WORKER_COUNT)
      .fill(null)
      .map(async () => {
        while (currentIndex < filesArray.length && !isShuttingDown) {
          const index = currentIndex++;
          const file = filesArray[index];
          const fullPath = pathResolve(REPO_ROOT, file);

          try {
            const result = await workerPool!.processFile(fullPath, file);

            if (result && !result.skipped) {
              const { imports, teams } = result;

              // Map packages to teams (minimal memory - only store what we need)
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
          } catch (error) {
            // Skip files that can't be processed
          }
        }
      });

    await Promise.all(workerLoops);

    if (isShuttingDown) {
      log.write('\n⚠️  Processing was interrupted\n');
      process.exitCode = 1;
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

  // Convert Sets to arrays
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

  // Read existing renovate config to preserve structure
  const renovateConfig: RenovateConfig = JSON.parse(readFileSync(RENOVATE_CONFIG_PATH, 'utf8'));

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
    writeFileSync(options.reportJsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    log.info(`📝 Wrote JSON report to ${options.reportJsonPath}`);
  }

  if (applyChanges) {
    writeFileSync(RENOVATE_CONFIG_PATH, JSON.stringify(renovateConfig, null, 2) + '\n', 'utf8');
    log.success(`✅ Updated reviewers in ${RENOVATE_CONFIG_PATH}`);
  } else {
    log.success(`✅ Dry run complete (no files written)`);
  }

  if (mode === 'check' && report.managedSyncNeeded > 0) {
    // Non-zero exit in check mode only for explicitly-managed rules.
    process.exitCode = 1;
  }
}
