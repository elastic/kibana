/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile, spawn } from 'child_process';
import { availableParallelism } from 'os';
import { isAbsolute, join, resolve } from 'path';
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'fs';

import type { RunOptions } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { findPackageForPath, type Package } from '@kbn/repo-packages';
import { Listr, type ListrTask } from 'listr2';

const MAX_PARALLELISM = availableParallelism();
const IS_CI = process.env.CI === 'true';
const buildkiteQuickchecksFolder = join('.buildkite', 'scripts', 'steps', 'checks');
const quickChecksList = join(buildkiteQuickchecksFolder, 'quick_checks.json');
const COLLECT_COMMITS_MARKER_FILE = join(REPO_ROOT, '.collect_commits_marker');

interface QuickCheck {
  script: string;
  nodeCommand?: string;
  mayChangeFiles?: boolean;
  skipLocal?: boolean;
  /** Skip this check in local runs when no target packages are identified */
  skipLocalIfNoPackages?: boolean;
  /** Argument name for passing target files as comma-separated list (e.g., "--files") */
  filesArg?: string;
  /** Argument name for passing target packages as multiple arguments (e.g., "--path" becomes "--path ./pkg1 --path ./pkg2") */
  pathArg?: string;
  /** Argument name for passing target packages as comma-separated list (e.g., "--packages") */
  packagesArg?: string;
  /** If true, append target packages as positional arguments (e.g., "cmd pkg1 pkg2") */
  positionalPackages?: boolean;
}

interface CheckResult {
  success: boolean;
  script: string;
  output: string;
  durationMs: number;
}

const scriptOptions: RunOptions = {
  description: `
    Runs sanity-testing quick-checks in parallel.
      - arguments (--file, --dir, --checks) are exclusive - only one can be used at a time.
  `,
  flags: {
    string: ['dir', 'checks', 'file', 'files'],
    boolean: ['fix', 'show-commands'],
    help: `
        --file             Run all checks from a given file. (default='${quickChecksList}')
        --dir              Run all checks in a given directory.
        --checks           Runs all scripts given in this parameter. (comma or newline delimited)
        --files            Optional list of target files (comma or newline delimited). When provided,
                           the script identifies which Kibana plugins/packages contain these files
                           and scopes checks to those packages.
        --fix              Enable auto-fix mode. When enabled, checks that may change files run
                           sequentially to avoid conflicts. Defaults to true in CI, false locally.
        --show-commands    Show the exact command being run for each check. Useful for debugging.
                           
      `,
  },
  log: {
    context: 'quick-checks',
    defaultLevel: process.env.CI === 'true' ? 'debug' : 'info',
  },
};

let showCommands = false;
let targetFiles: string | undefined;
let targetPackages: string | undefined;

let logger: ToolingLog;
void run(async ({ log, flagsReader }) => {
  logger = log;
  const scriptStartTime = Date.now();

  // Clean up any existing marker file from previous runs
  if (existsSync(COLLECT_COMMITS_MARKER_FILE)) {
    unlinkSync(COLLECT_COMMITS_MARKER_FILE);
  }

  // Set environment variable so check scripts know where to write the marker file
  process.env.COLLECT_COMMITS_MARKER_FILE = COLLECT_COMMITS_MARKER_FILE;

  // Handle optional --files parameter
  const filesArg = flagsReader.string('files');
  if (filesArg) {
    const fileListArray = filesArg
      .trim()
      .split(/[,\n]/)
      .map((f) => f.trim())
      .filter(Boolean);

    // Find affected packages for the given files
    const affectedPackages = findAffectedPackages(fileListArray);

    // Set module-level variables for use in runCheckAsync
    targetFiles = fileListArray.join(',');
    targetPackages = affectedPackages.map((pkg) => pkg.normalizedRepoRelativeDir).join(',');

    logger.info(`Target files specified: ${fileListArray.length} file(s)`);
    logger.info(
      `Affected packages: ${
        affectedPackages.length > 0 ? affectedPackages.map((p) => p.id).join(', ') : '(none found)'
      }`
    );
  }

  let checksToRun = collectScriptsToRun({
    targetFile: flagsReader.string('file'),
    targetDir: flagsReader.string('dir'),
    checks: flagsReader.string('checks'),
  });

  // Filter out checks marked as skipLocal when running locally (not in CI)
  if (!IS_CI) {
    const skippedChecks = checksToRun.filter((check) => check.skipLocal);
    if (skippedChecks.length > 0) {
      const skippedNames = skippedChecks.map((c) => getScriptShortName(c.script)).join(', ');
      logger.info(`Skipping ${skippedChecks.length} check(s) for local run: ${skippedNames}`);
    }
    checksToRun = checksToRun.filter((check) => !check.skipLocal);

    // Skip checks that require package scoping when no packages are identified
    if (!targetPackages) {
      const noPackageScopeSkipped = checksToRun.filter((check) => check.skipLocalIfNoPackages);
      if (noPackageScopeSkipped.length > 0) {
        const skippedNames = noPackageScopeSkipped
          .map((c) => getScriptShortName(c.script))
          .join(', ');
        logger.info(
          `Skipping ${noPackageScopeSkipped.length} check(s) (no package scope): ${skippedNames}`
        );
      }
      checksToRun = checksToRun.filter((check) => !check.skipLocalIfNoPackages);
    }
  }

  // Determine fix mode: defaults to true in CI, false locally
  // Can be explicitly set via --fix flag
  const fixFlagValue = flagsReader.boolean('fix');
  const fixMode = fixFlagValue !== undefined ? fixFlagValue : IS_CI;

  // Set show-commands mode for debugging
  showCommands = flagsReader.boolean('show-commands') ?? false;

  // Map all checks to CheckToRun format
  const allChecks = checksToRun.map((check) => ({
    script: isAbsolute(check.script) ? check.script : join(REPO_ROOT, check.script),
    nodeCommand: check.nodeCommand,
    filesArg: check.filesArg,
    pathArg: check.pathArg,
    packagesArg: check.packagesArg,
    positionalPackages: check.positionalPackages,
    mayChangeFiles: check.mayChangeFiles,
  }));

  let results: CheckResult[];
  const startTime = Date.now();

  if (fixMode) {
    // Fix mode: partition checks - mayChangeFiles run sequentially, others in parallel
    const fileChangingChecks = allChecks.filter((check) => check.mayChangeFiles);
    const regularChecks = allChecks.filter((check) => !check.mayChangeFiles);

    logger.write(
      `--- Running ${checksToRun.length} checks with --fix (${fileChangingChecks.length} sequential, ${regularChecks.length} parallel) using ${MAX_PARALLELISM} cores...`
    );
    logger.write('');
    results = await runPartitionedChecks(fileChangingChecks, regularChecks);
  } else {
    // No fix mode: run all checks in parallel for maximum speed
    logger.write(
      `--- Running ${checksToRun.length} checks in parallel using ${MAX_PARALLELISM} cores...`
    );
    logger.write('');
    results = await runAllChecksInParallel(allChecks);
  }

  logger.write('--- All checks finished.');
  printResults(startTime, results);

  // Check if any commits were made and push them in a single batch
  // This allows multiple quick-check fixes to be committed and pushed together,
  // avoiding multiple CI restarts when a PR has multiple offenses.
  // File-changing checks run with parallelism=1 (sequentially), so commits happen
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
    logger.write(`See the script(s) marked with ❌ above for details.`);
    process.exitCode = 1;
  } else if (!commitsWereMade) {
    logger.write('--- All checks passed. ✅');
  }

  // Display total elapsed time at the end
  const totalElapsedTime = humanizeTime(Date.now() - scriptStartTime);
  logger.write(`\n--- Total elapsed time: ${totalElapsedTime}`);

  return results;
}, scriptOptions);

function collectScriptsToRun(inputOptions: {
  targetFile: string | undefined;
  targetDir: string | undefined;
  checks: string | undefined;
}): QuickCheck[] {
  const { targetFile, targetDir, checks } = inputOptions;
  if ([targetFile, targetDir, checks].filter(Boolean).length > 1) {
    throw new Error('Only one of --file, --dir, or --checks can be used at a time.');
  }

  if (targetDir) {
    const targetDirAbsolute = isAbsolute(targetDir) ? targetDir : join(REPO_ROOT, targetDir);
    return readdirSync(targetDirAbsolute).map((file) => ({ script: join(targetDir, file) }));
  } else if (checks) {
    return checks
      .trim()
      .split(/[,\n]/)
      .map((script) => ({ script: script.trim() }));
  } else {
    const targetFileWithDefault = targetFile || quickChecksList;
    const targetFileAbsolute = isAbsolute(targetFileWithDefault)
      ? targetFileWithDefault
      : join(REPO_ROOT, targetFileWithDefault);

    const fileContent = readFileSync(targetFileAbsolute, 'utf-8');

    // Support both JSON and legacy plain text formats for backward compatibility
    if (targetFileAbsolute.endsWith('.json')) {
      return JSON.parse(fileContent) as QuickCheck[];
    } else {
      // Legacy plain text format
      return fileContent
        .trim()
        .split('\n')
        .map((line) => ({ script: line.trim() }));
    }
  }
}

interface CheckToRun {
  script: string;
  nodeCommand?: string;
  filesArg?: string;
  pathArg?: string;
  packagesArg?: string;
  positionalPackages?: boolean;
  mayChangeFiles?: boolean;
}

interface ListrContext {
  results: CheckResult[];
}

function createListrTask(check: CheckToRun, label: string): ListrTask<ListrContext> {
  const scriptName = getScriptShortName(check.script);
  const command = getCommandForCheck(check);
  return {
    title: `${label} ${scriptName}`,
    task: async (ctx, task) => {
      const result = await runCheckAsync(check);
      ctx.results.push(result);
      const time = humanizeTime(result.durationMs);
      const commandSuffix = showCommands ? ` (${command})` : '';
      if (result.success) {
        task.title = `${label} ${scriptName} (${time})${commandSuffix}`;
      } else {
        throw new Error(`${scriptName} failed (${time})${commandSuffix}`);
      }
    },
  };
}

/** Returns the command that will be executed for a check */
function getCommandForCheck(check: CheckToRun): string {
  const { script, nodeCommand, filesArg, pathArg, packagesArg, positionalPackages } = check;

  // When running locally (not CI) and a nodeCommand is available, run it directly
  if (!IS_CI && nodeCommand) {
    let fullCommand = nodeCommand;
    const args: string[] = [];

    if (targetFiles && filesArg) {
      args.push(`${filesArg} ${targetFiles}`);
    }

    if (targetPackages) {
      if (positionalPackages) {
        args.push(targetPackages.split(',').join(' '));
      } else if (packagesArg) {
        args.push(`${packagesArg} ${targetPackages}`);
      } else if (pathArg) {
        const pathArgs = targetPackages
          .split(',')
          .map((pkg) => `${pathArg} ./${pkg}`)
          .join(' ');
        args.push(pathArgs);
      }
    }

    if (args.length > 0) {
      fullCommand = `${nodeCommand} ${args.join(' ')}`;
    }

    return fullCommand;
  }

  // In CI or when no nodeCommand, use shell script
  return `bash ${script}`;
}

async function runPartitionedChecks(
  fileChangingChecks: CheckToRun[],
  regularChecks: CheckToRun[]
): Promise<CheckResult[]> {
  const context: ListrContext = { results: [] };

  // Create tasks for sequential checks (file-changing)
  const seqTasks: ListrTask<ListrContext>[] = fileChangingChecks.map((check, idx) =>
    createListrTask(check, `seq [${idx + 1}/${fileChangingChecks.length}]`)
  );

  // Create tasks for parallel checks
  const parallelTasks: ListrTask<ListrContext>[] = regularChecks.map((check, idx) =>
    createListrTask(check, `    [${idx + 1}/${regularChecks.length}]`)
  );

  const list = new Listr<ListrContext>(
    [
      {
        title: 'Sequential checks (may change files)',
        task: (_, task) =>
          task.newListr(seqTasks, {
            concurrent: false, // Run sequentially
            exitOnError: false, // Continue even if one fails
            rendererOptions: { collapseSubtasks: false },
          }),
        skip: () => seqTasks.length === 0,
      },
      {
        title: 'Parallel checks',
        task: (_, task) =>
          task.newListr(parallelTasks, {
            concurrent: MAX_PARALLELISM, // Run in parallel
            exitOnError: false, // Continue even if one fails
            rendererOptions: { collapseSubtasks: false },
          }),
        skip: () => parallelTasks.length === 0,
      },
    ],
    {
      concurrent: true, // Run both groups concurrently
      exitOnError: false,
      renderer: (IS_CI ? 'verbose' : 'default') as any,
      rendererOptions: {
        collapseSubtasks: false,
        collapseErrors: false,
      },
    }
  );

  try {
    await list.run(context);
  } catch {
    // Errors are tracked in results, we don't need to throw
  }

  return context.results;
}

async function runAllChecksInParallel(checks: CheckToRun[]): Promise<CheckResult[]> {
  const context: ListrContext = { results: [] };

  // Create tasks for all checks
  const tasks: ListrTask<ListrContext>[] = checks.map((check, idx) =>
    createListrTask(check, `[${idx + 1}/${checks.length}]`)
  );

  const list = new Listr<ListrContext>(
    [
      {
        title: 'All checks (parallel)',
        task: (_, task) =>
          task.newListr(tasks, {
            concurrent: MAX_PARALLELISM, // Run in parallel
            exitOnError: false, // Continue even if one fails
            rendererOptions: { collapseSubtasks: false },
          }),
        skip: () => tasks.length === 0,
      },
    ],
    {
      concurrent: false,
      exitOnError: false,
      renderer: (IS_CI ? 'verbose' : 'default') as any,
      rendererOptions: {
        collapseSubtasks: false,
        collapseErrors: false,
      },
    }
  );

  try {
    await list.run(context);
  } catch {
    // Errors are tracked in results, we don't need to throw
  }

  return context.results;
}

function getScriptShortName(script: string): string {
  // Extract just the check name from the full path
  // e.g., ".buildkite/scripts/steps/checks/ts_projects.sh" -> "ts_projects"
  const basename = script.split('/').pop() || script;
  return basename.replace('.sh', '');
}

async function runCheckAsync(checkToRun: CheckToRun): Promise<CheckResult> {
  const { script, nodeCommand, filesArg, pathArg, packagesArg, positionalPackages } = checkToRun;
  const startTime = Date.now();

  // When running locally (not CI) and a nodeCommand is available, run it directly
  // This is faster than running through the shell script
  if (!IS_CI && nodeCommand) {
    // Build the command with file/path/packages arguments if supported
    let fullCommand = nodeCommand;
    const args: string[] = [];

    // Add files argument if supported and target files exist
    if (targetFiles && filesArg) {
      args.push(`${filesArg} ${targetFiles}`);
    }

    // Add packages argument if supported and target packages exist
    if (targetPackages) {
      if (positionalPackages) {
        // Script accepts packages as positional arguments (space-separated)
        args.push(targetPackages.split(',').join(' '));
      } else if (packagesArg) {
        // Script supports --packages argument, pass target packages as comma-separated list
        args.push(`${packagesArg} ${targetPackages}`);
      } else if (pathArg) {
        // Script supports --path argument, pass target packages as multiple arguments
        const pathArgs = targetPackages
          .split(',')
          .map((pkg) => `${pathArg} ./${pkg}`)
          .join(' ');
        args.push(pathArgs);
      }
    }

    if (args.length > 0) {
      fullCommand = `${nodeCommand} ${args.join(' ')}`;
    }

    return runNodeCommand(fullCommand, script, startTime);
  }

  // In CI or when no nodeCommand, use shell script (which handles env vars)
  return runShellScript(script, startTime);
}

// Maximum output to capture per check (to avoid memory issues)
const MAX_OUTPUT_SIZE = 100 * 1024; // 100KB per check

function createLimitedOutputCapture() {
  let output = '';
  return {
    append: (data: string | Buffer) => {
      const str = data.toString();
      output += str;
      // Keep only the last MAX_OUTPUT_SIZE characters
      if (output.length > MAX_OUTPUT_SIZE) {
        output = '...(truncated)...\n' + output.slice(-MAX_OUTPUT_SIZE);
      }
    },
    get: () => output,
  };
}

async function runNodeCommand(
  nodeCommand: string,
  script: string,
  startTime: number
): Promise<CheckResult> {
  return new Promise((resolveFn) => {
    const parts = nodeCommand.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    const childProcess = spawn(cmd, args, {
      cwd: REPO_ROOT,
      env: { ...process.env },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const outputCapture = createLimitedOutputCapture();

    childProcess.stdout?.on('data', outputCapture.append);
    childProcess.stderr?.on('data', outputCapture.append);

    childProcess.on('close', (code) => {
      resolveFn({
        success: code === 0,
        script,
        output: outputCapture.get(),
        durationMs: Date.now() - startTime,
      });
    });

    childProcess.on('error', (error) => {
      resolveFn({
        success: false,
        script,
        output: error.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

async function runShellScript(script: string, startTime: number): Promise<CheckResult> {
  return new Promise((resolveFn) => {
    validateScriptPath(script);

    const scriptProcess = spawn('bash', [script], {
      cwd: REPO_ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const outputCapture = createLimitedOutputCapture();

    scriptProcess.stdout?.on('data', outputCapture.append);
    scriptProcess.stderr?.on('data', outputCapture.append);

    scriptProcess.on('close', (code) => {
      resolveFn({
        success: code === 0,
        script,
        output: outputCapture.get(),
        durationMs: Date.now() - startTime,
      });
    });

    scriptProcess.on('error', (error) => {
      resolveFn({
        success: false,
        script,
        output: error.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

function printResults(startTimestamp: number, results: CheckResult[]) {
  const totalDuration = results.reduce((acc, result) => acc + result.durationMs, 0);
  const total = humanizeTime(totalDuration);
  const effective = humanizeTime(Date.now() - startTimestamp);
  logger.info(`- Total time: ${total}, effective: ${effective}`);

  results.forEach((result) => {
    const resultLabel = result.success ? '✅' : '❌';
    const scriptPath = stripRoot(result.script);
    const runtime = humanizeTime(result.durationMs);
    logger.write(`--- ${resultLabel} ${scriptPath}: ${runtime}`);
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

function validateScriptPath(scriptPath: string) {
  if (!isAbsolute(scriptPath)) {
    logger.error(`Invalid script path: ${scriptPath}`);
    throw new Error('Invalid script path');
  } else if (!scriptPath.endsWith('.sh')) {
    logger.error(`Invalid script extension: ${scriptPath}`);
    throw new Error('Invalid script extension');
  } else if (!existsSync(scriptPath)) {
    logger.error(`Script not found: ${scriptPath}`);
    throw new Error('Script not found');
  } else {
    return;
  }
}

function stripRoot(script: string) {
  return script.replace(REPO_ROOT, '');
}

/**
 * Find all unique packages that contain the given files
 */
function findAffectedPackages(files: string[]): Package[] {
  const packagesMap = new Map<string, Package>();

  for (const file of files) {
    // Convert to absolute path if relative
    const absolutePath = isAbsolute(file) ? file : resolve(REPO_ROOT, file);

    // Find the package that contains this file
    const pkg = findPackageForPath(REPO_ROOT, absolutePath);
    if (pkg && !packagesMap.has(pkg.id)) {
      packagesMap.set(pkg.id, pkg);
    }
  }

  return Array.from(packagesMap.values());
}

async function pushCommits(): Promise<void> {
  return new Promise((resolveFn, reject) => {
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
        resolveFn();
      } else {
        reject(new Error(`git push failed with code ${code}: ${output}`));
      }
    });

    pushProcess.on('error', (error) => {
      reject(error);
    });
  });
}
