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
import { REPO_ROOT } from '@kbn/repo-info';

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

const runUnitTestsInputSchema = z.object({});

async function getChangedFiles(): Promise<string[]> {
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
}

function findPackageDir(filePath: string): string | null {
  let dir = path.dirname(path.resolve(process.cwd(), filePath));
  const root = process.cwd();
  while (dir && dir !== root) {
    if (fs.existsSync(path.join(dir, 'jest.config.js'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

interface TestResult {
  package: string;
  status: 'passed' | 'failed';
  failedFiles?: string[];
}

async function runJestAndCollectFailures(pkgDir: string, files: string[]): Promise<string[]> {
  try {
    await execa.command(
      `node scripts/jest --config ${path.relative(
        process.cwd(),
        pkgDir
      )}/jest.config.js --findRelatedTests ${files.join(' ')} --json`,
      { cwd: REPO_ROOT }
    );
    return [];
  } catch (err: any) {
    const jsonPart = err.stdout.slice(err.stdout.indexOf('{'));
    const report = JSON.parse(jsonPart);
    const failedFiles: string[] = [];
    for (const suite of report.testResults || []) {
      if (suite.status === 'failed') {
        failedFiles.push(suite.name);
      }
    }
    return failedFiles;
  }
}

async function runUnitTests() {
  const changedFiles = await getChangedFiles();
  const changedFilesGroupedByPkg: Record<string, string[]> = {};
  for (const file of changedFiles) {
    const pkgDir = findPackageDir(file);
    if (pkgDir) {
      changedFilesGroupedByPkg[pkgDir] = changedFilesGroupedByPkg[pkgDir] || [];
      changedFilesGroupedByPkg[pkgDir].push(file);
    }
  }

  // Could not find any changed files
  if (Object.keys(changedFilesGroupedByPkg).length === 0) {
    return { success: true, results: [] };
  }

  const results: TestResult[] = [];

  for (const pkg of Object.keys(changedFilesGroupedByPkg)) {
    const pkgChangedFiles = changedFilesGroupedByPkg[pkg];
    const failedFiles = await runJestAndCollectFailures(pkg, pkgChangedFiles);
    results.push({
      package: pkg,
      status: failedFiles.length > 0 ? 'failed' : 'passed',
      failedFiles,
    });
  }

  const success = results.every((r) => r.status === 'passed');
  return { success, results };
}

export const runUnitTestsTool: ToolDefinition<typeof runUnitTestsInputSchema> = {
  name: 'run_unit_tests',
  description: 'Run unit tests for changed files',
  inputSchema: runUnitTestsInputSchema,
  handler: async () => {
    const result = await runUnitTests();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  },
};
