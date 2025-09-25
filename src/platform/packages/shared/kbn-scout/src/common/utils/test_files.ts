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

function isTestFile(fileName: string): boolean {
  return fileName.endsWith('.spec.ts');
}

/**
 * Checks if a directory contains any test files (recursively)
 */
function hasTestFilesInDirectory(dirPath: string): boolean {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (hasTestFilesInDirectory(fullPath)) {
        return true;
      }
    } else if (entry.isFile() && isTestFile(entry.name)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that a path is within one of the allowed scout directories
 * @param normalizedPath Normalized path to validate
 * @param originalPath Original path for error messages
 * @param isFile Whether the path is a file (affects validation specificity)
 */
function validateScoutPath(normalizedPath: string, originalPath: string, isFile: boolean): void {
  const allowedTestPaths = ['/scout/ui/tests', '/scout/ui/parallel_tests', '/scout/api/tests'];

  const validationPatterns = isFile
    ? allowedTestPaths.map((pattern) => `${pattern}/`)
    : allowedTestPaths;

  const isValidScoutPath = validationPatterns.some((pattern) => normalizedPath.includes(pattern));

  if (!isValidScoutPath) {
    const pathType = isFile ? 'Test file' : 'Directory';
    throw createFlagError(
      `${pathType} must be within one of ${allowedTestPaths.join(
        ', '
      )} directories: ${originalPath}`
    );
  }
}

/**
 * Validates and processes a single file path
 */
function validateFile(testPath: string, fullPath: string): string {
  if (!isTestFile(path.basename(fullPath))) {
    throw createFlagError(`File must be a test file ending '*.spec.ts': ${testPath}`);
  }

  const normalizedPath = testPath.replace(/\\/g, '/');
  validateScoutPath(normalizedPath, testPath, true);

  return testPath;
}

/**
 * Validates and processes a single directory path
 */
function validateDirectory(testPath: string, fullPath: string): string {
  if (!hasTestFilesInDirectory(fullPath)) {
    throw createFlagError(`No test files found in directory: ${testPath}`);
  }

  const normalizedPath = testPath.replace(/\\/g, '/');
  validateScoutPath(normalizedPath, testPath, false);

  return testPath;
}

/**
 * Validates and processes test files or directories, deriving the appropriate config path
 * @param testFilesList Comma-separated string of test file/directory paths
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
    const fullPath = path.resolve(REPO_ROOT, testPath);

    // Basic path validation
    if (!fullPath.startsWith(REPO_ROOT)) {
      throw createFlagError(`Path must be within the repository: ${testPath}`);
    }

    if (!fs.existsSync(fullPath)) {
      throw createFlagError(`Path does not exist: ${testPath}`);
    }

    // Validate and process based on path type
    const stat = fs.statSync(fullPath);
    let validatedPath: string;

    if (stat.isFile()) {
      validatedPath = validateFile(testPath, fullPath);
    } else if (stat.isDirectory()) {
      validatedPath = validateDirectory(testPath, fullPath);
    } else {
      throw createFlagError(`Path must be a file or directory: ${testPath}`);
    }

    testFiles.push(validatedPath);

    // Derive and validate config path consistency
    const normalizedPath = testPath.replace(/\\/g, '/');
    const derivedConfigForPath = deriveConfigPath(normalizedPath, testPath);

    if (derivedConfigPath === null) {
      derivedConfigPath = derivedConfigForPath;
    } else if (derivedConfigPath !== derivedConfigForPath) {
      throw createFlagError(
        `All paths must be from the same scout test directory (either 'scout/ui/tests', 'scout/ui/parallel_tests', or 'scout/api/tests')`
      );
    }
  }

  return {
    testFiles,
    configPath: derivedConfigPath!,
  };
}

/**
 * Derives the appropriate Playwright config path based on the test file/directory location
 * @param normalizedPath Normalized test file/directory path
 * @param originalPath Original test file/directory path for error messages
 * @returns Derived config path
 */
function deriveConfigPath(normalizedPath: string, originalPath: string): string {
  if (normalizedPath.includes('/scout/ui/parallel_tests')) {
    const scoutBasePath = extractScoutBasePath(normalizedPath, '/scout/ui/');
    return `${scoutBasePath}/parallel.playwright.config.ts`;
  } else if (normalizedPath.includes('/scout/ui/tests')) {
    const scoutBasePath = extractScoutBasePath(normalizedPath, '/scout/ui/');
    return `${scoutBasePath}/playwright.config.ts`;
  } else if (normalizedPath.includes('/scout/api/tests')) {
    const scoutBasePath = extractScoutBasePath(normalizedPath, '/scout/api/');
    return `${scoutBasePath}/playwright.config.ts`;
  } else {
    throw createFlagError(`Unable to derive config path for path: ${originalPath}`);
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
