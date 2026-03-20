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
import ignore from 'ignore';

const IGNORED_FILENAMES = ['moon.yml'];

const isIgnoredFile = (repoRel: string): boolean =>
  IGNORED_FILENAMES.some((fileName) => repoRel.endsWith(`/${fileName}`));

// Scout test files live inside plugins/packages
const SCOUT_TEST_PATTERNS = [
  ':(glob)src/platform/**/test/scout*/**/*.spec.ts',
  ':(glob)src/core/**/test/scout*/**/*.spec.ts',
  ':(glob)x-pack/**/**/test/scout*/**/*.spec.ts',
];

// FTR tests live under top-level directories, not inside plugins or packages
const FTR_TEST_PATTERNS = [
  'src/platform/test',
  'x-pack/platform/test',
  ':(glob)x-pack/solutions/*/test/**',
];

// Jest tests are co-located with source files anywhere in the repository
const JEST_TEST_PATTERNS = [
  ':(glob)**/*.test.ts',
  ':(glob)**/*.test.tsx',
  ':(glob)**/*.test.js',
  ':(glob)**/*.test.jsx',
];

// No dedup needed as these groups are disjoint:  Scout uses .spec.ts, Jest uses .test.*
// and FTR tests live in separate top-level directories
const TEST_FILE_GROUPS = [
  { label: 'Scout', patterns: SCOUT_TEST_PATTERNS },
  { label: 'FTR', patterns: FTR_TEST_PATTERNS },
  { label: 'Jest', patterns: JEST_TEST_PATTERNS },
];

export async function checkTestCodeOwnersCLI(): Promise<void> {
  await run(
    async ({ log }) => {
      const matcher = ignore().add(
        getCodeOwnersEntries()
          .filter((entry) => entry.teams.length > 0)
          .map((entry) => entry.pattern)
      );
      const hasOwner = (path: string): boolean => matcher.test(path).ignored;

      let totalFiles = 0;
      const allMissing: string[] = [];

      for (const { label, patterns } of TEST_FILE_GROUPS) {
        const files = (await getRepoFiles(patterns)).filter(
          (repoPath) => !isIgnoredFile(repoPath.repoRel)
        );
        totalFiles += files.length;

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
