/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { getRepoFiles } from '@kbn/get-repo-files';
import { getCodeOwnersEntries } from '@kbn/code-owners';
import type { RepoPath } from '@kbn/repo-path';
import ignore from 'ignore';

const FTR_TEST_PATTERNS = [
  'src/platform/test',
  'x-pack/platform/test',
  ':(glob)x-pack/solutions/*/test/**',
];

const SCOUT_TEST_PATTERNS = [
  ':(glob)src/platform/**/test/scout*/**',
  ':(glob)x-pack/platform/**/test/scout*/**',
  ':(glob)x-pack/solutions/**/test/scout*/**',
];

const JEST_TEST_PATTERNS = [
  ':(glob)**/*.test.ts',
  ':(glob)**/*.test.tsx',
  ':(glob)**/*.test.js',
  ':(glob)**/*.test.jsx',
];

interface TestFileGroup {
  label: string;
  files: RepoPath[];
}

async function getTestFileGroups(): Promise<TestFileGroup[]> {
  const [ftrFiles, scoutFiles, jestFiles] = await Promise.all([
    getRepoFiles(FTR_TEST_PATTERNS),
    getRepoFiles(SCOUT_TEST_PATTERNS),
    getRepoFiles(JEST_TEST_PATTERNS),
  ]);

  const seen = new Set(ftrFiles.map((f) => f.repoRel));
  const dedup = (files: RepoPath[]): RepoPath[] =>
    files.filter((f) => {
      if (seen.has(f.repoRel)) return false;
      seen.add(f.repoRel);
      return true;
    });

  return [
    { label: 'FTR', files: ftrFiles },
    { label: 'Scout', files: dedup(scoutFiles) },
    { label: 'Jest', files: dedup(jestFiles) },
  ];
}

export async function checkTestCodeOwnersCLI() {
  await run(
    async ({ log }) => {
      const matcher = ignore().add(
        getCodeOwnersEntries()
          .filter((entry) => entry.teams.length > 0)
          .map((entry) => entry.pattern)
      );
      const hasOwner = (path: string): boolean => matcher.test(path).ignored;

      const groups = await getTestFileGroups();
      const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);
      const allMissing: string[] = [];

      for (const { label, files } of groups) {
        const missing = files
          .filter((repoPath) => !hasOwner(repoPath.repoRel))
          .map((repoPath) => repoPath.repoRel);

        if (missing.length > 0) {
          log.write(`${label} test files without a code owner:`);
          log.write(missing.map((i) => ` - ${i}`).join('\n'));
        }

        allMissing.push(...missing);
      }

      log.info(`Checked ${totalFiles} test files in ${process.uptime().toFixed(2)}s`);

      if (allMissing.length === 0) {
        log.success('All test files have a code owner 🥳');
        return;
      }

      throw createFailError(`Found ${allMissing.length} test files without code owner`);
    },
    {
      description: 'Check that all test files (FTR, Scout, Jest) are covered by GitHub CODEOWNERS',
    }
  );
}
