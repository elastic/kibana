/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { exec } from 'child_process';
import execa from 'execa';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPkgsById } from '@kbn/repo-packages';

import type { ToolDefinition } from '../types';

const execAsync = promisify(exec);

const IGNORED_EXTENSIONS = [
  '.json',
  '.md',
  '.mdx',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.yml',
  '.yaml',
  '.lock',
  '.txt',
];

const runUnitTestsInputSchema = z.object({
  collectCoverage: z
    .boolean()
    .optional()
    .describe('Whether to collect and report code coverage. Defaults to false.'),
  verbose: z
    .boolean()
    .optional()
    .describe('Include full failure messages and stack traces. Defaults to true.'),
  package: z
    .string()
    .optional()
    .describe(
      'Optional package identifier. Can be a package ID (e.g., "@kbn/mcp-dev-server"), a directory path relative to repo root (e.g., "src/platform/packages/shared/kbn-mcp-dev-server"), or an absolute path. If provided, runs all tests for that package instead of only changed files.'
    ),
});

/**
 * Detailed information about an individual test assertion.
 */
interface AssertionResult {
  testName: string;
  ancestorTitles: string[];
  status: 'passed' | 'failed' | 'pending';
  failureMessages: string[];
  location?: {
    line: number;
    column: number;
  };
}

/**
 * Results for a single test file/suite.
 */
interface TestSuiteResult {
  filePath: string;
  relativePath: string;
  status: 'passed' | 'failed';
  numPassingTests: number;
  numFailingTests: number;
  assertions: AssertionResult[];
}

/**
 * Coverage statistics for a metric category.
 */
interface CoverageMetric {
  total: number;
  covered: number;
  pct: number;
}

/**
 * Aggregated coverage summary across all files.
 */
interface CoverageSummary {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

/**
 * Coverage details for an individual file.
 */
interface FileCoverage {
  path: string;
  relativePath: string;
  lines: CoverageMetric;
  uncoveredLines: number[];
}

/**
 * Complete test results for a package.
 */
interface PackageTestResult {
  package: string;
  status: 'passed' | 'failed';
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
  testSuites: TestSuiteResult[];
  coverage?: {
    summary: CoverageSummary;
    files: FileCoverage[];
  };
}

/**
 * Jest assertion result from the JSON report.
 */
interface JestAssertionResult {
  title: string;
  ancestorTitles?: string[];
  status: 'passed' | 'failed' | 'pending';
  failureMessages?: string[];
  location?: {
    line: number;
    column: number;
  };
}

/**
 * Jest test suite result from the JSON report.
 */
interface JestTestResult {
  name: string;
  status: 'passed' | 'failed';
  assertionResults?: JestAssertionResult[];
}

/**
 * Structure of Jest's JSON output report.
 */
interface JestReport {
  testResults?: JestTestResult[];
}

const getChangedFiles = async (): Promise<string[]> => {
  const [{ stdout: modifiedFiles }, { stdout: untrackedFiles }] = await Promise.all([
    execAsync('git diff --name-only --diff-filter=AM HEAD'),
    execAsync('git ls-files --others --exclude-standard'),
  ]);

  return [...modifiedFiles.split('\n'), ...untrackedFiles.split('\n')]
    .filter(Boolean)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return !IGNORED_EXTENSIONS.includes(ext);
    });
};

const findPackageDir = (filePath: string): string | null => {
  let dir = path.dirname(path.resolve(REPO_ROOT, filePath));
  while (dir && dir !== REPO_ROOT && dir !== '/') {
    if (fs.existsSync(path.join(dir, 'jest.config.js'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
};

/**
 * Finds a package directory by package ID, directory path, or partial name.
 * @param identifier Package ID (e.g., "@kbn/mcp-dev-server"), directory path, or partial name.
 * @returns Absolute path to package directory, or null if not found.
 */
const findPackageByIdentifier = (identifier: string): string | null => {
  // Try to find by package ID first.
  const packagesById = getPkgsById(REPO_ROOT);
  const normalizedId = identifier.toLowerCase();
  const pkg = packagesById.get(normalizedId);
  if (pkg) {
    return path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir);
  }

  // Try partial match on package IDs.
  for (const [pkgId, matchedPkg] of packagesById.entries()) {
    if (pkgId.includes(normalizedId) || normalizedId.includes(pkgId)) {
      return path.resolve(REPO_ROOT, matchedPkg.normalizedRepoRelativeDir);
    }
  }

  // Try as directory path.
  let dirPath: string;
  if (path.isAbsolute(identifier)) {
    dirPath = identifier;
  } else {
    dirPath = path.resolve(REPO_ROOT, identifier);
  }

  // Check if the directory exists and has a jest.config.js.
  if (fs.existsSync(dirPath) && fs.existsSync(path.join(dirPath, 'jest.config.js'))) {
    return dirPath;
  }

  // Try to find package directory by traversing up from the given path.
  const foundDir = findPackageDir(dirPath);
  if (foundDir) {
    return foundDir;
  }

  return null;
};

const truncateMessage = (message: string, maxLength: number): string => {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength) + '... [truncated]';
};

const parseCoverage = (
  pkgDir: string
): { summary: CoverageSummary; files: FileCoverage[] } | undefined => {
  const summaryPath = path.join(pkgDir, 'coverage', 'coverage-summary.json');
  const detailPath = path.join(pkgDir, 'coverage', 'coverage-final.json');

  if (!fs.existsSync(summaryPath)) {
    return undefined;
  }

  const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  const summary: CoverageSummary = {
    lines: summaryData.total.lines,
    statements: summaryData.total.statements,
    functions: summaryData.total.functions,
    branches: summaryData.total.branches,
  };

  const files: FileCoverage[] = [];

  if (fs.existsSync(detailPath)) {
    const detailData = JSON.parse(fs.readFileSync(detailPath, 'utf-8'));

    for (const [filePath, fileData] of Object.entries(detailData) as [string, any][]) {
      const uncoveredLines = Object.entries(fileData.statementMap)
        .filter(([key]) => fileData.s[key] === 0)
        .map(([, value]: [string, any]) => value.start.line);

      const lineStats = summaryData[filePath]?.lines || { total: 0, covered: 0, pct: 0 };

      files.push({
        path: filePath,
        relativePath: path.relative(REPO_ROOT, filePath),
        lines: lineStats,
        uncoveredLines: Array.from(new Set(uncoveredLines)).sort((a, b) => a - b),
      });
    }
  }

  return { summary, files };
};

const createReportPath = async (
  pkgDir: string
): Promise<{ reportPath: string; cleanup: () => Promise<void> }> => {
  const buildPath = async (basePrefix: string) => {
    const tempDir = await fsPromises.mkdtemp(basePrefix);
    const reportPath = path.join(tempDir, 'mcp-jest-report.json');
    const cleanup = async () => {
      await fsPromises.rm(tempDir, { recursive: true, force: true });
    };
    return { reportPath, cleanup };
  };

  const targetDir = path.join(pkgDir, 'target');
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return await buildPath(path.join(targetDir, 'mcp-jest-'));
  } catch {
    // Fall back to OS temp dir if package dir is unavailable (e.g., in tests or mock FS).
    return await buildPath(path.join(os.tmpdir(), 'mcp-jest-'));
  }
};

const parseReportFromOutput = (output: string): unknown => {
  const firstBrace = output.indexOf('{');
  if (firstBrace === -1) {
    return null;
  }
  try {
    const candidate = output.slice(firstBrace);
    try {
      return JSON.parse(candidate);
    } catch {
      const lastBrace = candidate.lastIndexOf('}');
      if (lastBrace !== -1) {
        return JSON.parse(candidate.slice(0, lastBrace + 1));
      }
      return null;
    }
  } catch {
    return null;
  }
};

const parseJestResults = (
  report: JestReport,
  pkgDir: string,
  options: { verbose: boolean }
): { testSuites: TestSuiteResult[]; coverage?: PackageTestResult['coverage'] } => {
  const testSuites: TestSuiteResult[] = [];

  for (const suite of report.testResults || []) {
    const assertions: AssertionResult[] = [];

    for (const assertion of suite.assertionResults || []) {
      assertions.push({
        testName: assertion.title,
        ancestorTitles: assertion.ancestorTitles || [],
        status: assertion.status,
        failureMessages: options.verbose
          ? assertion.failureMessages || []
          : assertion.failureMessages?.map((msg: string) => truncateMessage(msg, 500)) || [],
        location: assertion.location,
      });
    }

    testSuites.push({
      filePath: suite.name,
      relativePath: path.relative(REPO_ROOT, suite.name),
      status: suite.status === 'failed' ? 'failed' : 'passed',
      numPassingTests: suite.assertionResults?.filter((a) => a.status === 'passed').length || 0,
      numFailingTests: suite.assertionResults?.filter((a) => a.status === 'failed').length || 0,
      assertions: assertions.filter((a) => a.status === 'failed' || options.verbose),
    });
  }

  const coverage = parseCoverage(pkgDir);

  return { testSuites, coverage };
};

const runJestWithDetails = async (
  pkgDir: string,
  files: string[] | null,
  options: { collectCoverage: boolean; verbose: boolean }
): Promise<{
  testSuites: TestSuiteResult[];
  coverage?: PackageTestResult['coverage'];
  warning?: string;
}> => {
  const { reportPath, cleanup } = await createReportPath(pkgDir);
  const coverageDir = path.join(pkgDir, 'coverage');
  const coverageArgs = options.collectCoverage
    ? `--coverage --coverageDirectory=${coverageDir} --coverageReporters=json-summary --coverageReporters=json`
    : '';

  const configPath = path.relative(REPO_ROOT, pkgDir);

  // If files are provided, run tests for those specific files.
  // Otherwise, run all tests for the package.
  const testCommand =
    files && files.length > 0
      ? `node scripts/jest --config ${configPath}/jest.config.js --findRelatedTests ${files.join(
          ' '
        )} --json --outputFile ${reportPath} ${coverageArgs}`
      : `node scripts/jest --config ${configPath}/jest.config.js --json --outputFile ${reportPath} ${coverageArgs}`;

  try {
    const { all: combinedOutput = '', exitCode } = await execa.command(testCommand, {
      cwd: REPO_ROOT,
      env: process.env,
      extendEnv: true,
      reject: false, // Don't throw on non-zero exit codes.
      all: true, // Combine stdout and stderr into the "all" property.
    });
    let report: unknown;
    let hasReport = false;

    if (fs.existsSync(reportPath)) {
      try {
        const reportRaw = await fsPromises.readFile(reportPath, 'utf-8');
        report = JSON.parse(reportRaw);
        hasReport = true;
      } catch {
        // Fall through to parse from stdout/stderr.
      }
    }

    if (!hasReport) {
      const parsed = parseReportFromOutput(combinedOutput);
      if (parsed) {
        report = parsed;
        hasReport = true;
      }
    }

    if (!hasReport) {
      if (exitCode === 0 || exitCode === undefined) {
        const reportLocation = path.relative(REPO_ROOT, reportPath);
        return {
          testSuites: [],
          coverage: undefined,
          warning: `Jest exited successfully but did not produce a JSON report at ${reportLocation}. This may indicate the test run was skipped or output was truncated.`,
        };
      }

      const errorMessage =
        combinedOutput.substring(Math.max(0, combinedOutput.length - 2000)) || 'No output';
      const reportLocation = path.relative(REPO_ROOT, reportPath);
      throw new Error(
        `Jest did not produce a JSON report at ${reportLocation} (exit code: ${exitCode}). Last output: ${errorMessage}`
      );
    }

    return parseJestResults(report as JestReport, pkgDir, options);
  } catch (err: unknown) {
    const error = err as { all?: string; stdout?: string; stderr?: string; message?: string };
    const combinedOutput =
      error.all || `${error.stdout || ''}${error.stderr ? `\n${error.stderr}` : ''}`;
    let report: unknown;
    let hasReport = false;

    if (fs.existsSync(reportPath)) {
      try {
        const reportRaw = await fsPromises.readFile(reportPath, 'utf-8');
        report = JSON.parse(reportRaw);
        hasReport = true;
      } catch {
        // Fall through.
      }
    }

    if (!hasReport) {
      const parsed = parseReportFromOutput(combinedOutput);
      if (parsed) {
        report = parsed;
        hasReport = true;
      }
    }

    if (hasReport) {
      return parseJestResults(report as JestReport, pkgDir, options);
    }

    const reportLocation = path.relative(REPO_ROOT, reportPath);
    throw new Error(
      `Failed to read Jest JSON report at ${reportLocation}: ${error.message || String(err)}`
    );
  } finally {
    await cleanup();
  }
};

const runUnitTests = async (options: {
  collectCoverage?: boolean;
  verbose?: boolean;
  package?: string;
}): Promise<{
  success: boolean;
  message?: string;
  results: PackageTestResult[];
}> => {
  const collectCoverage = options.collectCoverage ?? false;
  const verbose = options.verbose ?? true;

  // If a specific package is requested, run tests for that package.
  if (options.package) {
    const pkgDir = findPackageByIdentifier(options.package);
    if (!pkgDir) {
      return {
        success: false,
        message: `Package not found: ${options.package}. Please provide a valid package ID (e.g., "@kbn/mcp-dev-server"), directory path, or partial package name.`,
        results: [],
      };
    }

    if (!fs.existsSync(path.join(pkgDir, 'jest.config.js'))) {
      return {
        success: false,
        message: `Package directory found but does not have a jest.config.js: ${path.relative(
          REPO_ROOT,
          pkgDir
        )}`,
        results: [],
      };
    }

    // Run all tests for the package.
    try {
      const { testSuites, coverage, warning } = await runJestWithDetails(pkgDir, null, {
        collectCoverage,
        verbose,
      });

      const failedSuites = testSuites.filter((s) => s.status === 'failed');
      const totalTests = testSuites.reduce(
        (acc, s) => acc + s.numPassingTests + s.numFailingTests,
        0
      );
      const passedTests = testSuites.reduce((acc, s) => acc + s.numPassingTests, 0);
      const failedTests = testSuites.reduce((acc, s) => acc + s.numFailingTests, 0);

      return {
        success: failedSuites.length === 0,
        message: warning,
        results: [
          {
            package: path.relative(REPO_ROOT, pkgDir),
            status: failedSuites.length > 0 ? 'failed' : 'passed',
            summary: { totalTests, passedTests, failedTests },
            testSuites,
            coverage,
          },
        ],
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to run tests',
        results: [
          {
            package: path.relative(REPO_ROOT, pkgDir),
            status: 'failed',
            summary: { totalTests: 0, passedTests: 0, failedTests: 0 },
            testSuites: [],
          },
        ],
      };
    }
  }

  // Otherwise, run tests for changed files (existing behavior).
  const changedFiles = await getChangedFiles();
  const changedFilesGroupedByPkg: Record<string, string[]> = {};

  for (const file of changedFiles) {
    const pkgDir = findPackageDir(file);
    if (pkgDir) {
      changedFilesGroupedByPkg[pkgDir] = changedFilesGroupedByPkg[pkgDir] || [];
      changedFilesGroupedByPkg[pkgDir].push(file);
    }
  }

  if (Object.keys(changedFilesGroupedByPkg).length === 0) {
    return {
      success: true,
      message: 'No testable changed files found.',
      results: [],
    };
  }

  const results: PackageTestResult[] = [];
  const warnings: string[] = [];

  for (const pkg of Object.keys(changedFilesGroupedByPkg)) {
    const pkgChangedFiles = changedFilesGroupedByPkg[pkg];
    const { testSuites, coverage, warning } = await runJestWithDetails(pkg, pkgChangedFiles, {
      collectCoverage,
      verbose,
    });

    if (warning) {
      warnings.push(`${path.relative(REPO_ROOT, pkg)}: ${warning}`);
    }

    const failedSuites = testSuites.filter((s) => s.status === 'failed');
    const totalTests = testSuites.reduce(
      (acc, s) => acc + s.numPassingTests + s.numFailingTests,
      0
    );
    const passedTests = testSuites.reduce((acc, s) => acc + s.numPassingTests, 0);
    const failedTests = testSuites.reduce((acc, s) => acc + s.numFailingTests, 0);

    results.push({
      package: path.relative(REPO_ROOT, pkg),
      status: failedSuites.length > 0 ? 'failed' : 'passed',
      summary: { totalTests, passedTests, failedTests },
      testSuites,
      coverage,
    });
  }

  const success = results.every((r) => r.status === 'passed');
  return {
    success,
    message: warnings.length > 0 ? warnings.join('\n') : undefined,
    results,
  };
};

export const runUnitTestsTool: ToolDefinition<typeof runUnitTestsInputSchema> = {
  name: 'run_unit_tests',
  description: `Run unit tests for changed files or a specific package.

Returns detailed test results including:
- Individual test case names and their pass/fail status
- Full failure messages with stack traces for debugging
- Optional code coverage data with uncovered line numbers

Use 'collectCoverage: true' to identify untested code paths.
Use 'verbose: true' (default) for full error details.
Use 'package' to run all tests for a specific package instead of only changed files.
The 'package' parameter accepts:
- Package ID (e.g., "@kbn/mcp-dev-server")
- Directory path relative to repo root (e.g., "src/platform/packages/shared/kbn-mcp-dev-server")
- Absolute directory path
- Partial package name (will match the first package containing the string)`,
  inputSchema: runUnitTestsInputSchema,
  handler: async (input) => {
    const result = await runUnitTests(input);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
