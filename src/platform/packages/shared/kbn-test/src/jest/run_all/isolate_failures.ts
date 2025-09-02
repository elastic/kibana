/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Config } from '@jest/types';
import Path from 'path';
import type { SlimAggregatedResult } from './types';
import { runJestWithConfig } from './run_jest_with_config';
import { createTempJestConfig } from './create_temp_jest_config';

interface IsolateFailuresOptions {
  config: Config.InitialOptions;
  dataDir: string;
  log: ToolingLog;
  failedTestPath: string;
  initialRunResults: SlimAggregatedResult;
}

/**
 * Helper to run Jest for an explicit list of test files, preserving order.
 */
async function runJestWithFiles(
  config: Config.InitialOptions,
  dataDir: string,
  log: ToolingLog,
  configId: string,
  testFiles: string[],
  jestFlags: string[] = []
) {
  const tempConfigPath = await createTempJestConfig({
    config,
    dataDir,
    configId,
  });

  const resultsPath = Path.join(dataDir, `${configId}.results.json`);
  const finalJestFlags = [...jestFlags, ...testFiles];

  return await runJestWithConfig({
    configPath: tempConfigPath,
    dataDir,
    log,
    jestFlags: finalJestFlags,
    resultsPath,
  });
}

/**
 * Helper to run Jest with an override for roots and explicit test files.
 */
async function runJestWithRootsAndFiles(
  baseConfig: Config.InitialOptions,
  dataDir: string,
  log: ToolingLog,
  configId: string,
  roots: string[],
  testFiles: string[],
  jestFlags: string[] = []
) {
  const cfg: Config.InitialOptions = { ...baseConfig, roots };
  const tempConfigPath = await createTempJestConfig({
    config: cfg,
    dataDir,
    configId,
  });

  const resultsPath = Path.join(dataDir, `${configId}.results.json`);
  const finalJestFlags = [...jestFlags, ...testFiles];

  return await runJestWithConfig({
    configPath: tempConfigPath,
    dataDir,
    log,
    jestFlags: finalJestFlags,
    resultsPath,
  });
}

/**
 * Generic delta debugging helper: returns a 1-minimal subset that still triggers failure.
 */
async function ddmin<T>(
  candidates: T[],
  triggers: (subset: T[]) => Promise<boolean>
): Promise<T[]> {
  let n = 2;
  let current = [...candidates];
  while (current.length >= 2) {
    const chunkSize = Math.ceil(current.length / n);
    const subsets: T[][] = [];
    for (let i = 0; i < current.length; i += chunkSize) {
      subsets.push(current.slice(i, i + chunkSize));
    }

    let reduced = false;

    // Test each subset
    for (const subset of subsets) {
      if (await triggers(subset)) {
        current = subset;
        n = Math.max(n - 1, 2);
        reduced = true;
        break;
      }
    }

    if (reduced) continue;

    // Test complements
    for (const subset of subsets) {
      const complement = current.filter((x) => !subset.includes(x));
      if (complement.length > 0 && (await triggers(complement))) {
        current = complement;
        n = Math.max(n - 1, 2);
        reduced = true;
        break;
      }
    }

    if (!reduced) {
      if (n >= current.length) break;
      n = Math.min(current.length, n * 2);
    }
  }
  return current;
}

function extractFailureDetails(
  aggregated: SlimAggregatedResult
): { testPath?: string; testName?: string; errorMessage?: string } | undefined {
  const testResults = aggregated.testResults;
  for (const testResult of testResults) {
    const testPath = testResult.testFilePath;
    const assertions = testResult.testResults;

    if (assertions && assertions.length) {
      const failedAssertion = assertions.find((a) => a.status === 'failed');
      if (failedAssertion) {
        return {
          testPath,
          testName: failedAssertion.fullName || failedAssertion.title,
          errorMessage:
            failedAssertion.failureMessages?.[0] || (testResult.failureMessage ?? undefined),
        };
      }
    }
    if (testResult.numFailingTests > 0) {
      return {
        testPath,
        errorMessage: testResult.failureMessage ?? undefined,
      };
    }
  }
  return undefined;
}

/**
 * Returns true if the aggregated result includes a failure in the given target test file
 * and (optionally) the specific test name. Ignores failures in other files.
 */
function hasFailureInTarget(
  aggregated: SlimAggregatedResult,
  targetPath: string,
  targetTestName?: string
): boolean {
  const testSuites = aggregated.testResults;
  const normalizedTarget = Path.resolve(targetPath);

  for (const suite of testSuites) {
    if (!suite || !suite.testFilePath) continue;
    if (Path.resolve(suite.testFilePath) !== normalizedTarget) continue;

    // If there are no failing tests in the target suite, skip
    if (suite.numFailingTests <= 0) return false;

    const assertions = suite.testResults;

    // If a specific test name is provided, ensure that exact test fails
    if (targetTestName) {
      return assertions.some(
        (a) =>
          a.status === 'failed' && (a.fullName === targetTestName || a.title === targetTestName)
      );
    }
    // Otherwise, any failing assertion in the target suite is sufficient
    return assertions.some((a) => a.status === 'failed');
  }

  return false;
}

/**
 * Efficiently isolates the minimal set of roots within a config that cause a test failure
 * using binary search to reduce the number of test runs needed.
 */
export async function isolateFailures({
  config,
  dataDir,
  log,
  failedTestPath,
  initialRunResults,
}: IsolateFailuresOptions): Promise<string[] | null> {
  const roots = config.roots || [];

  log.warning(`Starting isolation process with ${roots.length} root(s) in config`);

  // Use initial run aggregated results to locate the failing test path and name
  const failing = extractFailureDetails(initialRunResults);
  if (!failing) {
    log.error('Unable to determine failing test results from aggregated results.');
    return null;
  }
  const targetTestName = failing.testName;

  // Identify the root that contains the failed test
  const rootDir = config.rootDir ? Path.resolve(String(config.rootDir)) : process.cwd();
  const normalizedFailedPath = Path.resolve(failedTestPath);
  // Resolve roots, honoring Jest's <rootDir> token and making paths absolute
  const normalizedRoots = roots.map((r) => {
    const replaced = r.includes('<rootDir>') ? r.replace(/<rootDir>/g, rootDir) : r;
    return Path.isAbsolute(replaced) ? Path.resolve(replaced) : Path.resolve(rootDir, replaced);
  });
  const containingRoot = normalizedRoots
    .filter((r) => normalizedFailedPath.startsWith(r + Path.sep) || normalizedFailedPath === r)
    .sort((a, b) => b.length - a.length)[0];

  // Debug info (use log at debug level rather than console)
  log.debug(
    () =>
      `isolate_failures: rootDir=${rootDir}, containingRoot=${containingRoot}, failedPath=${normalizedFailedPath}, roots=${JSON.stringify(
        normalizedRoots
      )}`
  );

  // 1) Verify the file in isolation under only its containing root (if any)
  if (containingRoot) {
    const runOneRoot = await runJestWithRootsAndFiles(
      config,
      dataDir,
      log,
      'verify-isolated-file-one-root',
      [containingRoot],
      [failedTestPath],
      ['--runInBand', '--silent']
    );

    if (runOneRoot.testResults.numFailedTests > 0) {
      const details = extractFailureDetails(runOneRoot.testResults);
      if (details?.testPath) log.error(`Test file: ${details.testPath}`);
      if (details?.testName) log.error(`Failed test: ${details.testName}`);
      if (details?.errorMessage) log.error(`Error: ${details.errorMessage}`);
      throw new Error(
        `Test fails in isolation (single root): ${details?.testPath || failedTestPath}${
          details?.testName ? ` - ${details.testName}` : ''
        }`
      );
    }

    // 2) Then verify the file with all roots present
    if (normalizedRoots.length > 1) {
      const runAllRoots = await runJestWithRootsAndFiles(
        config,
        dataDir,
        log,
        'verify-isolated-file-all-roots',
        normalizedRoots,
        [failedTestPath],
        ['--runInBand', '--silent']
      );

      if (hasFailureInTarget(runAllRoots.testResults, failedTestPath, targetTestName)) {
        // Other roots change behavior; find minimal culprit roots (besides containingRoot)
        const otherRoots = normalizedRoots.filter((r) => r !== containingRoot);
        const culpritRoots = await ddmin(otherRoots, async (subset) => {
          const runSubset = await runJestWithRootsAndFiles(
            config,
            dataDir,
            log,
            'verify-isolated-file-roots-ddmin',
            [containingRoot, ...subset],
            [failedTestPath],
            ['--runInBand', '--silent']
          );
          return hasFailureInTarget(runSubset.testResults, failedTestPath, targetTestName);
        });

        if (culpritRoots.length > 0) {
          log.error(
            `Identified minimal culprit root set of ${culpritRoots.length} dir(s) impacting the test:`
          );
          culpritRoots.forEach((r, i) => log.error(`  ${i + 1}. ${r}`));
          return culpritRoots; // Return culprit roots immediately
        }
      }
    }
  } else {
    // No containing root found; verify test file in isolation under base config
    const isolatedFileRun = await runJestWithFiles(
      config,
      dataDir,
      log,
      'verify-isolated-file',
      [failedTestPath],
      ['--runInBand', '--silent']
    );

    if (isolatedFileRun.testResults.numFailedTests > 0) {
      const details = extractFailureDetails(isolatedFileRun.testResults);
      if (details?.testPath) log.error(`Test file: ${details.testPath}`);
      if (details?.testName) log.error(`Failed test: ${details.testName}`);
      if (details?.errorMessage) log.error(`Error: ${details.errorMessage}`);
      throw new Error(
        `Test fails in isolation: ${details?.testPath || failedTestPath}${
          details?.testName ? ` - ${details.testName}` : ''
        }`
      );
    }
  }
  // targetTestName already captured above

  // Build the list of test files that ran before the failing test
  const suites = initialRunResults.testResults;
  const orderedPaths = suites.map((s) => s.testFilePath).sort();
  const failIndex = orderedPaths.indexOf(failedTestPath);
  const priorFiles = failIndex > 0 ? orderedPaths.slice(0, failIndex) : [];

  log.info(`Prior files count: ${priorFiles.length}`);

  // If no prior files, then nothing to bisect; proceed with root isolation as fallback
  if (priorFiles.length === 0) {
    log.info('No prior test files before the failing one; skipping order-based isolation.');
    return null;
  }

  // Find culprit test files using delta debugging (ddmin) for an effective minimal set
  const culprits: string[] = [];

  // Helper to check whether a set of prior files triggers the failure in the target
  const triggersFailure = async (candidateFiles: string[]): Promise<boolean> => {
    const testRun = await runJestWithFiles(
      config,
      dataDir,
      log,
      'order-check',
      [...candidateFiles, failedTestPath],
      ['--runInBand', '--silent']
    );

    if (testRun.testResults.numFailedTests === 0) return false;
    // Focus only on failures in the target test; ignore unrelated failures
    return hasFailureInTarget(testRun.testResults, failedTestPath, targetTestName);
  };

  // First verify the entire prior set triggers the target failure; if not, nothing to isolate.
  if (!(await triggersFailure(priorFiles))) {
    log.info('Prior files + target do not reproduce the target failure; skipping order isolation.');
    return null;
  }

  // Delta debugging to find a 1-minimal set of prior files that triggers the failure
  const minimalSet = await ddmin(priorFiles, triggersFailure);
  minimalSet.forEach((file) => {
    culprits.push(file);
    log.error(`Culprit test file: ${file}`);
    log.error(`Failure: ${failedTestPath}${targetTestName ? ` - ${targetTestName}` : ''}`);
  });

  if (culprits.length > 0) {
    log.error(`Identified minimal culprit set of ${culprits.length} file(s).`);
    culprits.forEach((c, i) => log.error(`  ${i + 1}. ${c}`));
    return culprits;
  }

  // End of test-file-based isolation; nothing else to do
  return null;
}
