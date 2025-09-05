/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import path from 'path';
import fs from 'fs';
import { createFlagError } from '@kbn/dev-cli-errors';

export interface TestFilesValidationResult {
  testFiles: string[];
  configPath: string;
}

/**
 * Validates and processes test files, deriving the appropriate config path
 * @param testFilesList Comma-separated string of test file paths
 * @returns Validation result with processed test files and derived config path
 */
export function validateAndProcessTestFiles(testFilesList: string): TestFilesValidationResult {
  const testFiles: string[] = [];
  const rawPaths = testFilesList
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  let derivedConfigPath: string | null = null;

  for (const testPath of rawPaths) {
    const fullTestFile = path.resolve(REPO_ROOT, testPath);

    if (!fullTestFile.startsWith(REPO_ROOT)) {
      throw createFlagError(`Test file must be within the repository: ${testPath}`);
    }

    if (!fs.existsSync(fullTestFile)) {
      throw createFlagError(`Test file does not exist: ${testPath}`);
    }

    const stat = fs.statSync(fullTestFile);
    if (!stat.isFile()) {
      throw createFlagError(`Test file must be a file, not a directory: ${testPath}`);
    }

    const normalizedPath = testPath.replace(/\\/g, '/'); // Normalize path separators
    const isValidScoutPath =
      normalizedPath.includes('/scout/ui/tests/') ||
      normalizedPath.includes('/scout/ui/parallel_tests/') ||
      normalizedPath.includes('/scout/api/tests/');

    if (!isValidScoutPath) {
      throw createFlagError(
        `Test file must be from 'scout/ui/tests', 'scout/ui/parallel_tests', or 'scout/api/tests' directory: ${testPath}`
      );
    }

    // Derive config path from test file path
    const derivedConfigForTest = deriveConfigPath(normalizedPath, testPath);

    // Ensure all test files derive the same config path
    if (derivedConfigPath === null) {
      derivedConfigPath = derivedConfigForTest;
    } else if (derivedConfigPath !== derivedConfigForTest) {
      throw createFlagError(
        `All test files must be from the same scout test directory (either 'scout/ui/tests', 'scout/ui/parallel_tests', or 'scout/api/tests')`
      );
    }

    testFiles.push(testPath);
  }

  return {
    testFiles,
    configPath: derivedConfigPath!,
  };
}

/**
 * Derives the appropriate Playwright config path based on the test file location
 * @param normalizedPath Normalized test file path
 * @param originalPath Original test file path for error messages
 * @returns Derived config path
 */
function deriveConfigPath(normalizedPath: string, originalPath: string): string {
  if (normalizedPath.includes('/scout/ui/parallel_tests/')) {
    const scoutBasePath = extractScoutBasePath(normalizedPath, '/scout/ui/');
    return `${scoutBasePath}/parallel.playwright.config.ts`;
  } else if (normalizedPath.includes('/scout/ui/tests/')) {
    const scoutBasePath = extractScoutBasePath(normalizedPath, '/scout/ui/');
    return `${scoutBasePath}/playwright.config.ts`;
  } else if (normalizedPath.includes('/scout/api/tests/')) {
    const scoutBasePath = extractScoutBasePath(normalizedPath, '/scout/api/');
    return `${scoutBasePath}/playwright.config.ts`;
  } else {
    throw createFlagError(`Unable to derive config path for test file: ${originalPath}`);
  }
}

/**
 * Extracts the base scout directory path from a normalized test file path
 * @param normalizedPath Normalized test file path
 * @param scoutPattern The scout pattern to search for (e.g., '/scout/ui/', '/scout/api/')
 * @returns Base scout directory path
 */
function extractScoutBasePath(normalizedPath: string, scoutPattern: string): string {
  const scoutIndex = normalizedPath.indexOf(scoutPattern);
  return normalizedPath.substring(0, scoutIndex + scoutPattern.length - 1);
}
