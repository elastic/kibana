/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';

import type { QuickChecksContext } from './types';
import { IS_CI, COLLECT_COMMITS_MARKER_FILE, QUICK_CHECKS_LIST } from './config';

import { cleanupMarkerFile, handleCommits } from './git/commits';
import { collectScriptsToRun, prepareChecks } from './checks/collect';
import { filterChecksForRun } from './checks/filter';
import { executeChecks } from './execution';
import { printResults } from './execution/results';
import { printSummary } from './execution/results';
import { resolveTargetFiles, processTargetFiles } from './targets/resolve';

/**
 * Main entry point for quick checks
 */
export function runQuickChecks() {
  void run(
    async ({ log, flagsReader }) => {
      const scriptStartTime = Date.now();

      // Initialize
      cleanupMarkerFile();
      process.env.COLLECT_COMMITS_MARKER_FILE = COLLECT_COMMITS_MARKER_FILE;

      // Determine fix mode: defaults to true in CI, false locally
      const fixFlagValue = flagsReader.boolean('fix');
      const fixMode = fixFlagValue !== undefined ? fixFlagValue : IS_CI;

      // Build context
      const context: QuickChecksContext = {
        log,
        showCommands: flagsReader.boolean('show-commands') ?? false,
        fixMode,
        isCI: IS_CI,
      };

      // Resolve target files and affected packages
      const targetFileList = await resolveTargetFiles({
        branchFlag: flagsReader.boolean('branch'),
        filesArg: flagsReader.string('files'),
        checkDependents: flagsReader.boolean('check-dependents'),
        log,
      });

      const { targetFiles, targetPackages } = processTargetFiles(targetFileList, log);

      context.targetFiles = targetFiles;
      context.targetPackages = targetPackages;

      // Collect and filter checks
      let checksToRun = collectScriptsToRun({
        targetFile: flagsReader.string('file'),
        targetDir: flagsReader.string('dir'),
        checks: flagsReader.string('checks'),
      });

      const { checks: filteredChecks } = filterChecksForRun({
        checks: checksToRun,
        isCI: IS_CI,
        hasTargetPackages: Boolean(targetPackages),
        log,
      });

      checksToRun = filteredChecks;

      // Prepare and execute checks
      const allChecks = prepareChecks(checksToRun);

      const startTime = Date.now();
      const results = await executeChecks(allChecks, context);

      // Print results
      log.write('--- All checks finished.');
      printResults(startTime, results, log);

      // Handle commits if any were made
      let commitsWereMade = false;

      try {
        commitsWereMade = await handleCommits(log);
        if (commitsWereMade) {
          process.exitCode = 1;
        }
      } catch {
        process.exitCode = 1;
      }

      // Print summary and set exit code
      const exitCode = printSummary(results, commitsWereMade, scriptStartTime, log);

      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }

      return results;
    },
    {
      description: `
      Runs sanity-testing quick-checks in parallel.
        - arguments (--file, --dir, --checks) are exclusive - only one can be used at a time.
    `,
      flags: {
        string: ['dir', 'checks', 'file', 'files'],
        boolean: ['fix', 'show-commands', 'branch', 'check-dependents'],
        help: `
          --file             Run all checks from a given file. (default='${QUICK_CHECKS_LIST}')
          --dir              Run all checks in a given directory.
          --checks           Runs all scripts given in this parameter. (comma or newline delimited)
          --files            Optional list of target files (comma or newline delimited). When provided,
                             the script identifies which Kibana plugins/packages contain these files
                             and scopes checks to those packages.
          --branch           Run checks on files changed in the current branch compared to upstream main.
                             Automatically detects the elastic/kibana remote (upstream, origin, etc.).
          --check-dependents When used with --files or --branch, also includes files that import the
                             changed files. Useful for catching cascading issues.
          --fix              Enable auto-fix mode. When enabled, checks that may change files run
                             sequentially to avoid conflicts. Defaults to true in CI, false locally.
          --show-commands    Show the exact command being run for each check. Useful for debugging.
        `,
      },
      log: {
        context: 'quick-checks',
        defaultLevel: process.env.CI === 'true' ? 'debug' : 'info',
      },
    }
  );
}
