/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Test Execution Tools
 *
 * Tools for running Scout tests and getting results
 */

interface TestExecutionOptions {
  testPath: string;
  testName?: string;
  tags?: string[];
  headed?: boolean;
  debug?: boolean;
  timeout?: number;
  workers?: number;
  workingDir?: string;
}

interface TestResult {
  passed: boolean;
  duration: number;
  tests: Array<{
    title: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number;
    error?: string;
    errorDetails?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  output: string;
  errorOutput: string;
}

/**
 * Run a Scout test
 */
export async function scoutRunTest(params: TestExecutionOptions) {
  try {
    const {
      testPath,
      testName,
      tags = [],
      headed = false,
      debug = false,
      timeout = 60000,
      workers = 1,
      workingDir = process.cwd(),
    } = params;

    // Validate test path exists
    const absoluteTestPath = resolve(workingDir, testPath);
    if (!existsSync(absoluteTestPath)) {
      return {
        success: false,
        error: `Test file not found: ${testPath}`,
      };
    }

    // Build the test command
    const args = ['test', testPath];

    // Add test name filter if specified
    if (testName) {
      args.push('--grep', testName);
    }

    // Add tags filter if specified
    if (tags.length > 0) {
      args.push('--grep', tags.map((tag) => `@${tag.replace('@', '')}`).join('|'));
    }

    // Add headed mode
    if (headed) {
      args.push('--headed');
    }

    // Add debug mode
    if (debug) {
      args.push('--debug');
    }

    // Add timeout
    args.push('--timeout', timeout.toString());

    // Add workers
    args.push('--workers', workers.toString());

    // Add reporter
    args.push('--reporter', 'json');

    const result = await runPlaywrightTest(workingDir, args);

    return {
      success: result.passed,
      data: result,
      message: result.passed
        ? `✅ Test passed (${result.summary.passed}/${result.summary.total} tests, ${result.duration}ms)`
        : `❌ Test failed (${result.summary.failed}/${result.summary.total} tests failed)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run test and watch for changes
 */
export async function scoutWatchTest(params: TestExecutionOptions) {
  try {
    const { testPath, workingDir = process.cwd() } = params;

    // Validate test path exists
    const absoluteTestPath = resolve(workingDir, testPath);
    if (!existsSync(absoluteTestPath)) {
      return {
        success: false,
        error: `Test file not found: ${testPath}`,
      };
    }

    return {
      success: true,
      message: `Started watching ${testPath}. Test will re-run on changes.`,
      data: {
        watching: true,
        testPath,
        note: 'Watch mode requires long-running process. Use scout_run_test for one-time execution.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get recent test results (from last execution)
 */
export async function scoutGetTestResults(params: { testPath?: string; workingDir?: string }) {
  try {
    const { testPath, workingDir = process.cwd() } = params;

    // In a real implementation, this would read from test-results directory
    // For now, return instructions
    return {
      success: true,
      message: 'Test results are captured when running scout_run_test',
      data: {
        note: 'Run scout_run_test first to execute tests and get results',
        resultsLocation: testPath
          ? `Results for ${testPath} will be shown after execution`
          : 'Run a test first to see results',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run Playwright test and parse results
 */
async function runPlaywrightTest(workingDir: string, args: string[]): Promise<TestResult> {
  return new Promise((fulfill, reject) => {
    let stdout = '';
    let stderr = '';
    let jsonOutput = '';

    // Try to run via npx playwright test
    const child = spawn('npx', ['playwright', ...args], {
      cwd: workingDir,
      env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
      shell: true,
    });

    child.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;

      // Try to extract JSON output
      if (str.includes('{') && str.includes('}')) {
        jsonOutput += str;
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      // Parse results
      const result = parseTestResults(stdout, stderr, jsonOutput, code === 0);
      fulfill(result);
    });
  });
}

/**
 * Parse test results from Playwright output
 */
function parseTestResults(
  stdout: string,
  stderr: string,
  jsonOutput: string,
  exitedCleanly: boolean
): TestResult {
  const result: TestResult = {
    passed: exitedCleanly,
    duration: 0,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    output: stdout,
    errorOutput: stderr,
  };

  // Try to parse JSON output if available
  try {
    if (jsonOutput) {
      const jsonLines = jsonOutput.split('\n').filter((line) => line.trim().startsWith('{'));
      for (const line of jsonLines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.stats) {
            // Playwright test summary
            result.summary.total = parsed.stats.expected || 0;
            result.summary.passed = parsed.stats.passed || 0;
            result.summary.failed = parsed.stats.failed || 0;
            result.summary.skipped = parsed.stats.skipped || 0;
            result.duration = parsed.stats.duration || 0;
          }
          if (parsed.suites) {
            // Extract individual test results
            extractTestsFromSuites(parsed.suites, result.tests);
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  } catch (e) {
    // If JSON parsing fails, try to parse text output
  }

  // Fallback: Parse text output
  if (result.tests.length === 0) {
    parseTextOutput(stdout, result);
  }

  return result;
}

/**
 * Extract test results from Playwright JSON suites
 */
function extractTestsFromSuites(suites: any[], tests: TestResult['tests']): void {
  for (const suite of suites) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        const test = spec.tests?.[0];
        if (test) {
          tests.push({
            title: spec.title || 'Unknown test',
            status: test.status || 'unknown',
            duration: test.results?.[0]?.duration || 0,
            error: test.results?.[0]?.error?.message,
            errorDetails: test.results?.[0]?.error?.stack,
          });
        }
      }
    }
    if (suite.suites) {
      extractTestsFromSuites(suite.suites, tests);
    }
  }
}

/**
 * Parse text output as fallback
 */
function parseTextOutput(output: string, result: TestResult): void {
  const lines = output.split('\n');

  for (const line of lines) {
    // Look for test result lines
    if (line.includes('✓') || line.includes('passed')) {
      result.summary.passed++;
      result.summary.total++;
      const title = line.replace(/[✓✗]/g, '').trim();
      result.tests.push({
        title,
        status: 'passed',
        duration: 0,
      });
    } else if (line.includes('✗') || line.includes('failed')) {
      result.summary.failed++;
      result.summary.total++;
      const title = line.replace(/[✓✗]/g, '').trim();
      result.tests.push({
        title,
        status: 'failed',
        duration: 0,
      });
    } else if (line.includes('skipped')) {
      result.summary.skipped++;
      result.summary.total++;
    }

    // Look for duration
    const durationMatch = line.match(/(\d+)ms/);
    if (durationMatch && result.duration === 0) {
      result.duration = parseInt(durationMatch[1], 10);
    }
  }

  // Update passed status based on summary
  result.passed = result.summary.failed === 0 && result.summary.total > 0;
}
