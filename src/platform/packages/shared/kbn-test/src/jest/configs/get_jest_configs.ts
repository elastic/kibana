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

const execAsync = promisify(exec);

/**
 * Finds test files for each Jest configuration in the repository using parallel git ls-files commands.
 *
 * @returns Promise resolving to object with configs that have tests and configs that don't
 */
export async function getJestConfigs(configPaths?: string[]): Promise<{
  configsWithTests: Array<{ config: string; testFiles: string[] }>;
  emptyConfigs: string[];
}> {
  try {
    let configFiles: string[] = [];
    let testFiles: string[] = [];

    // If config paths are provided, use them directly
    if (configPaths && configPaths.length > 0) {
      // Use provided config paths directly (support absolute or repo-relative)
      configFiles = configPaths.map((p) => resolve(REPO_ROOT, p));

      // Build restricted git pathspecs for tests under the config directories
      const uniqueDirs = [...new Set(configFiles.map((p) => dirname(p)))];
      const pathspecs = uniqueDirs.flatMap((absDir) => {
        const rel = absDir
          .replace(REPO_ROOT + osSep, '')
          .split(osSep)
          .join('/');
        return [
          `":(glob)${rel}/**/*.test.ts"`,
          `":(glob)${rel}/**/*.test.tsx"`,
          `":(glob)${rel}/**/*.test.js"`,
          `":(glob)${rel}/**/*.test.jsx"`,
        ];
      });

      const { stdout } = await execAsync(`git ls-files ${pathspecs.join(' ')}`, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
      });

      testFiles = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((file) => resolve(REPO_ROOT, file));
    } else {
      // If config paths are not provided, find them for the whole repo
      // Run both git commands in parallel for better performance
      const [configResult, testResult] = await Promise.all([
        execAsync('git ls-files "*jest.config*.js"', {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer to handle large repositories
        }),
        execAsync('git ls-files "*.test.ts" "*.test.tsx" "*.test.js" "*.test.jsx"', {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer to handle large repositories
        }),
      ]);

      configFiles = configResult.stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((file) => resolve(REPO_ROOT, file));

      testFiles = testResult.stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((file) => resolve(REPO_ROOT, file));
    }

    // Group test files by their nearest config and separate empty configs
    const configsWithTests: Array<{ config: string; testFiles: string[] }> = [];
    const emptyConfigs: string[] = [];

    configFiles.forEach((configPath) => {
      const configDir = dirname(configPath);
      const relatedTestFiles = testFiles.filter((testFile) => {
        return testFile.startsWith(configDir + osSep);
      });

      if (relatedTestFiles.length > 0) {
        configsWithTests.push({
          config: configPath,
          testFiles: relatedTestFiles,
        });
      } else {
        emptyConfigs.push(configPath);
      }
    });

    return { configsWithTests, emptyConfigs };
  } catch (error) {
    throw new Error(`Failed to get tests for configs: ${error}`);
  }
}
