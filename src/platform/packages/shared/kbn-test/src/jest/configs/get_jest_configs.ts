/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { dirname, resolve, sep as osSep } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { asyncMapWithLimit } from '@kbn/std';

const execAsync = promisify(exec);

interface JestConfigRules {
  roots: string[];
  testMatch: string[];
  testPathIgnorePatterns: string[];
  testRegex: string[];
}

/**
 * Jest config discovery using git ls-files and simplified parsing.
 *
 * Uses a fast git ls-files + simplified parsing approach for most configs,
 * then falls back to Jest's SearchSource for configs that appear empty
 * to catch edge cases that the simplified parsing might miss.
 *
 * @param configPaths Optional array of specific config paths to process
 * @returns Promise resolving to object with configs that have tests, configs that don't, orphaned test files, and duplicates
 */
export async function getJestConfigs(configPaths?: string[]): Promise<{
  configsWithTests: Array<{ config: string; testFiles: string[] }>;
  emptyConfigs: string[];
  orphanedTestFiles: string[];
  duplicateTestFiles: Array<{ testFile: string; configs: string[] }>;
}> {
  try {
    // Step 1: Get all config files and all potential test files
    let configFiles: string[];
    let allTestFiles: string[];

    if (configPaths && configPaths.length > 0) {
      // Use provided config paths and get test files separately
      configFiles = configPaths.map((config) => resolve(REPO_ROOT, config));

      const testFilesResult = await execAsync(`git ls-files -- '*.test.ts' '*.test.tsx'`, {
        cwd: REPO_ROOT,
        maxBuffer: 1024 * 1024 * 10,
      });

      allTestFiles = testFilesResult.stdout
        .split('\n')
        .filter(Boolean)
        .map((file) => resolve(REPO_ROOT, file))
        .filter((file) => existsSync(file));
    } else {
      // Merge both git commands into one for better performance
      const combinedResult = await execAsync(
        `git ls-files -- '*.test.ts' '*.test.tsx' '**/jest.config.js' '**/*/jest.config.js' '**/jest.integration.config.js' '**/*/jest.integration.config.js'`,
        { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 10 }
      );

      const allFiles = combinedResult.stdout
        .split('\n')
        .filter(Boolean)
        .map((file) => resolve(REPO_ROOT, file))
        .filter((file) => existsSync(file));

      // Separate configs from test files using regex patterns
      const configPattern = /jest(\.integration)?\.config\.(j|t)s$/;
      const testPattern = /\.(test|spec)\.(ts|tsx)$/;

      configFiles = allFiles.filter((file) => configPattern.test(file));
      allTestFiles = allFiles.filter((file) => testPattern.test(file));
    }

    // Step 2: Parse all config files in parallel and apply Jest matching rules using fast heuristic
    const configTestResults = await Promise.all(
      configFiles.map(async (configPath) => {
        const rules = parseJestConfig(configPath);

        // If parsing failed, return empty (will be rechecked with Jest's SearchSource)
        if (!rules) {
          return {
            config: configPath,
            testFiles: [],
          };
        }

        const matchingTestFiles = allTestFiles.filter((testFile) =>
          matchesJestRules(testFile, rules)
        );

        return {
          config: configPath,
          testFiles: matchingTestFiles,
        };
      })
    );

    // Step 3: Build initial mapping and identify potential issues
    let configsWithTests: Array<{ config: string; testFiles: string[] }> = [];
    let emptyConfigs: string[] = [];
    const testFileToConfigs = new Map<string, string[]>();

    configTestResults.forEach(({ config, testFiles }) => {
      if (testFiles.length === 0) {
        emptyConfigs.push(config);
      } else {
        configsWithTests.push({ config, testFiles });
        testFiles.forEach((testFile) => {
          const configs = testFileToConfigs.get(testFile) || [];
          configs.push(config);
          testFileToConfigs.set(testFile, configs);
        });
      }
    });

    // Step 4: Identify configs that need SearchSource double-checking
    const configsToRecheck = new Set<string>();

    // Add empty configs for rechecking
    emptyConfigs.forEach((config) => configsToRecheck.add(config));

    // Add configs involved in duplicates for rechecking
    testFileToConfigs.forEach((configs) => {
      if (configs.length > 1) {
        configs.forEach((config) => configsToRecheck.add(config));
      }
    });

    // Step 5: Use SearchSource to get accurate results for problematic configs
    const searchSourceResults = await asyncMapWithLimit(
      Array.from(configsToRecheck),
      10,
      async (configPath) => {
        const testFiles = await getTestPathsWithSearchSource(configPath);
        return { config: configPath, testFiles };
      }
    );

    // Step 6: Replace problematic configs with accurate SearchSource results
    // Remove configs that were rechecked from the original results
    configsWithTests = configsWithTests.filter(({ config }) => !configsToRecheck.has(config));
    emptyConfigs = emptyConfigs.filter((config) => !configsToRecheck.has(config));

    // Add back the accurate results from SearchSource
    searchSourceResults.forEach(({ config, testFiles }) => {
      if (testFiles.length > 0) {
        configsWithTests.push({ config, testFiles });
      } else {
        emptyConfigs.push(config);
      }
    });

    // Step 7: Rebuild final test file mapping and find issues
    const finalTestFileToConfigs = new Map<string, string[]>();
    const coveredTestFiles = new Set<string>();

    configsWithTests.forEach(({ config, testFiles }) => {
      testFiles.forEach((testFile) => {
        const configs = finalTestFileToConfigs.get(testFile) || [];
        configs.push(config);
        finalTestFileToConfigs.set(testFile, configs);
        coveredTestFiles.add(testFile);
      });
    });

    // Find orphaned test files
    const orphanedTestFiles = allTestFiles.filter((testFile) => !coveredTestFiles.has(testFile));

    // Find test files covered by multiple configs
    const duplicateTestFiles = Array.from(finalTestFileToConfigs.entries())
      .filter(([, configs]) => configs.length > 1)
      .map(([testFile, configs]) => ({ testFile, configs }));

    return { configsWithTests, emptyConfigs, orphanedTestFiles, duplicateTestFiles };
  } catch (error) {
    throw new Error(`Failed to get tests for configs: ${error}`);
  }
}

/**
 * Parse a Jest config file and extract test matching rules
 * We emulate the parsing logic of Jest's SearchSource, but without loading the Jest module
 * which speeds us up.
 */
function parseJestConfig(configPath: string): JestConfigRules | null {
  try {
    const configContent = readFileSync(configPath, 'utf8');

    // Default Jest rules
    const rules: JestConfigRules = {
      roots: ['<rootDir>'],
      testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      testPathIgnorePatterns: ['/node_modules/'],
      testRegex: [],
    };

    // Extract the config directory for resolving relative paths
    const configDir = dirname(configPath);

    // Parse rootDir if specified
    let actualRootDir = configDir;
    const rootDirMatch = configContent.match(/rootDir\s*:\s*['"]([^'"]+)['"]/);
    if (rootDirMatch) {
      const rootDirValue = rootDirMatch[1];
      actualRootDir = resolve(configDir, rootDirValue);
    }

    // Simple regex-based extraction (covers most common cases)
    const rootsMatch = configContent.match(/roots\s*:\s*\[([^\]]+)\]/);
    if (rootsMatch) {
      const rootsContent = rootsMatch[1];
      const rootPaths = rootsContent
        .split(',')
        .map((r) => r.trim().replace(/['"]/g, ''))
        .filter(Boolean)
        .map((r) => r.replace('<rootDir>', actualRootDir));
      rules.roots = rootPaths;
    } else {
      rules.roots = [actualRootDir];
    }

    const testMatchMatch = configContent.match(/testMatch\s*:\s*\[([^\]]+)\]/);
    if (testMatchMatch) {
      const testMatchContent = testMatchMatch[1];
      rules.testMatch = testMatchContent
        .split(',')
        .map((t) => t.trim().replace(/['"]/g, ''))
        .filter(Boolean);
    }

    const testRegexMatch = configContent.match(/testRegex\s*:\s*\[([^\]]+)\]/);
    if (testRegexMatch) {
      const testRegexContent = testRegexMatch[1];
      rules.testRegex = testRegexContent
        .split(',')
        .map((t) => t.trim().replace(/['"]/g, ''))
        .filter(Boolean);
    }

    const ignoreMatch = configContent.match(/testPathIgnorePatterns\s*:\s*\[([^\]]+)\]/);
    if (ignoreMatch) {
      const ignoreContent = ignoreMatch[1];
      rules.testPathIgnorePatterns = ignoreContent
        .split(',')
        .map((i) => i.trim().replace(/['"]/g, ''))
        .filter(Boolean);
    }

    return rules;
  } catch (error) {
    // If parsing fails, return null so config will be rechecked with SearchSource
    return null;
  }
}

/**
 * Check if a test file matches Jest config rules
 */
function matchesJestRules(testFilePath: string, rules: JestConfigRules): boolean {
  // Check if file is in any of the roots
  const inRoots = rules.roots.some((root) => testFilePath.startsWith(root + osSep));
  if (!inRoots) return false;

  // Check ignore patterns - treat as path segments, not simple string contains
  const isIgnored = rules.testPathIgnorePatterns.some((pattern) => {
    // Convert Jest patterns to simple path matching
    // /node_modules/ should match /path/node_modules/ but not /path/my-node_modules-thing/
    const cleanPattern = pattern.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes

    // Check if the pattern appears as a complete path segment
    const pathSegments = testFilePath.split('/');
    return pathSegments.includes(cleanPattern);
  });
  if (isIgnored) return false;

  // For now, use simple heuristics: if it's a test file and in the right directory, it matches
  // This covers the most common cases without complex pattern matching
  const isTestFile =
    /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(testFilePath) ||
    testFilePath.includes('__tests__');

  return isTestFile;
}

const EMPTY_ARGV = {
  $0: '',
  _: [],
};

const NO_WARNINGS_CONSOLE = {
  ...console,
  warn() {
    // ignore haste-map warnings
  },
};

/**
 * Double-check a config using Jest's SearchSource to get accurate test paths
 * Used as a fallback for configs that appear to have no tests
 */
async function getTestPathsWithSearchSource(configPath: string): Promise<string[]> {
  try {
    // Use dynamic imports to avoid loading Jest modules in test environment
    const [{ readConfig }, { SearchSource }, Runtime] = await Promise.all([
      import('jest-config'),
      import('jest'),
      import('jest-runtime'),
    ]);

    const config = await readConfig(EMPTY_ARGV, configPath);
    const searchSource = new SearchSource(
      await Runtime.default.createContext(config.projectConfig, {
        maxWorkers: 1,
        watchman: false,
        watch: false,
        console: NO_WARNINGS_CONSOLE,
      })
    );

    const results = await searchSource.getTestPaths(config.globalConfig, undefined, undefined);
    return results.tests.map((t) => t.path);
  } catch (error) {
    // If Jest config fails to load, return empty array
    return [];
  }
}
