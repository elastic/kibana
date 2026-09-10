/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { runPlaywrightCLI } from './common';

export interface PlaywrightTestCLIOptions {
  // Browser to use for tests (default: "chromium")
  browser?: 'all' | 'chromium' | 'firefox' | 'webkit';

  // Configuration file, or a test directory with optional "playwright.config.{m,c}?{js,ts}"
  config?: string;

  // Run tests with Playwright Inspector
  debug?: boolean;

  // Fail if any test is flagged as flaky (default: false)
  failOnFlakyTests?: boolean;

  // Fail if test.only is called (default: false)
  forbidOnly?: boolean;

  // Run all tests in parallel (default: false)
  fullyParallel?: boolean;

  // Only run tests matching this regular expression (default: ".*")
  grep?: string;

  // Only run tests that do not match this regular expression
  grepInvert?: string;

  // Maximum time this test suite can run in milliseconds (default: unlimited)
  globalTimeoutMs?: number;

  // Run tests in headed browsers (default: headless)
  headed?: boolean;

  // Ignore screenshot and snapshot expectations
  ignoreSnapshots?: boolean;

  // Number of concurrent workers or percentage of logical CPU cores, use 1 to run in a single worker (default: 50%)
  workers?: number | string;

  // Only re-run the failures
  lastFailed?: boolean;

  // Collect all the tests and report them, but do not run
  list?: boolean;

  // Stop after the first N failures
  maxFailures?: number;

  // Do not run project dependencies
  noDeps?: boolean;

  // Only run test files that have been changed between 'HEAD' and this reference.
  // Defaults to running all uncommitted changes. Only supports Git.
  onlyChangedRef?: string;

  // Folder for output artifacts (default: "test-results")
  outputDir?: string;

  // Makes test run succeed even if no tests were found
  passWithNoTests?: boolean;

  // Only run tests from the specified list of projects, supports '*' wildcard (default: run all projects)
  project?: string;

  // Suppress stdio
  quiet?: boolean;

  // Run each test N times (default: 1)
  repeatEach?: number;

  // Reporters to use (default: "list")
  reporters?: (
    | 'list'
    | 'line'
    | 'dot'
    | 'json'
    | 'junit'
    | 'null'
    | 'github'
    | 'html'
    | 'blob'
    | string
  )[];

  // Maximum retry count for flaky tests, zero for no retries (default: no retries)
  retries?: number;

  // Shard tests and execute only the selected shard, specify in the form `current/all`, 1-based, for example `3/5`
  shard?: string;

  // Specify test timeout threshold in milliseconds, zero for unlimited (default: 30000)
  timeoutMs?: number;

  // Force tracing mode
  trace?:
    | 'on'
    | 'off'
    | 'on-first-retry'
    | 'on-all-retries'
    | 'retain-on-failure'
    | 'retain-on-first-failure';

  // Path to a single tsconfig applicable to all imported files
  // (default: look up tsconfig for each imported file separately)
  tsconfig?: string;

  // Update snapshots with actual results. Running tests without the flag defaults to "missing";
  // running tests with the flag but without a value defaults to "changed".
  updateSnapshots?: 'all' | 'changed' | 'missing' | 'none';

  // Run tests in interactive UI mode
  ui?: boolean;

  // Host to serve UI on; specifying this option opens UI in a browser tab
  uiHost?: string;

  // Port to serve UI on, 0 for any free port; specifying this option opens UI in a browser tab
  uiPort?: number;

  // Chooses the way source is updated
  updateSourceMethod?: 'overwrite' | '3way' | 'patch';

  // Stop after the first failure
  stopAfterFirstFailure?: boolean;
}

const PLAYWRIGHT_TEST_CLI_OPTION_MAPPINGS: Record<keyof PlaywrightTestCLIOptions, string> = {
  browser: '--browser',
  config: '--config',
  debug: '--debug',
  failOnFlakyTests: '--fail-on-flaky-tests',
  forbidOnly: '--forbid-only',
  fullyParallel: '--fully-parallel',
  grep: '--grep',
  grepInvert: '--grep-invert',
  globalTimeoutMs: '--global-timeout',
  headed: '--headed',
  ignoreSnapshots: '--ignore-snapshots',
  workers: '--workers',
  lastFailed: '--last-failed',
  list: '--list',
  maxFailures: '--max-failures',
  noDeps: '--no-deps',
  onlyChangedRef: '--only-changed',
  outputDir: '--output-dir',
  passWithNoTests: '--pass-with-no-tests',
  project: '--project',
  quiet: '--quiet',
  repeatEach: '--repeat-each',
  reporters: '--reporter',
  retries: '--retries',
  shard: '--shard',
  timeoutMs: '--timeout',
  trace: '--trace',
  tsconfig: '--tsconfig',
  updateSnapshots: '--updateSnapshots',
  ui: '--ui',
  uiHost: '--ui-host',
  uiPort: '--ui-port',
  updateSourceMethod: '--update-source-method',
  stopAfterFirstFailure: '-x',
};

export async function runPlaywrightTestCLI(
  options: PlaywrightTestCLIOptions,
  env?: Record<string, string>,
  log?: ToolingLog
) {
  const args = ['test'];

  Object.entries(options).forEach(([option, value]) => {
    const arg = PLAYWRIGHT_TEST_CLI_OPTION_MAPPINGS[option as keyof PlaywrightTestCLIOptions];

    switch (typeof value) {
      case 'string':
      case 'number':
        args.push(arg, value.toString());
        break;
      case 'boolean':
        if (!value) return;
        args.push(arg);
        break;
      case 'object':
        if (value instanceof Array) {
          args.push(arg, value.join(','));
        }
        break;
      default:
        args.push(arg, value);
    }
  });

  return runPlaywrightCLI(args, env, log);
}
