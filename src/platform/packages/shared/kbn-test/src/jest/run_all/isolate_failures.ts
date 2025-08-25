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
import type { AggregatedResult } from '@jest/reporters';
import { runJestWithConfig } from './run_jest_with_config';
import { createTempJestConfig } from './create_temp_jest_config';

interface IsolateFailuresOptions {
  config: Config.InitialOptions;
  dataDir: string;
  log: ToolingLog;
  failedTestPath: string;
  initialRunResults: AggregatedResult;
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
  const finalJestFlags = [...jestFlags, '--outputFile', resultsPath, ...testFiles];

  return await runJestWithConfig({
    configPath: tempConfigPath,
    dataDir,
    log,
    jestFlags: finalJestFlags,
    resultsPath,
  });
}

function extractFailureDetails(
  aggregated: AggregatedResult
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
  aggregated: AggregatedResult,
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
  const targetTestName = failing.testName;

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
  const ddmin = async (c: string[]): Promise<string[]> => {
    let n = 2;
    let current = [...c];
    while (current.length >= 2) {
      const chunkSize = Math.ceil(current.length / n);
      const subsets: string[][] = [];
      for (let i = 0; i < current.length; i += chunkSize) {
        subsets.push(current.slice(i, i + chunkSize));
      }

      let reduced = false;

      // Test each subset
      for (const subset of subsets) {
        if (await triggersFailure(subset)) {
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
        if (complement.length > 0 && (await triggersFailure(complement))) {
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
  };

  const minimalSet = await ddmin(priorFiles);
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
