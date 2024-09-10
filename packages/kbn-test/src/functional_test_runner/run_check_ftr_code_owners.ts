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
import { getCodeOwnersForFile, getPathsWithOwnersReversed } from '@kbn/code-owners';

const TEST_DIRECTORIES = ['test', 'x-pack/test', 'x-pack/test_serverless'];

const fmtMs = (ms: number) => {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(Math.round(ms) / 1000).toFixed(2)} s`;
};

const fmtList = (list: Iterable<string>) => [...list].map((i) => ` - ${i}`).join('\n');

export async function runCheckFtrCodeOwnersCli() {
  run(
    async ({ log }) => {
      const start = performance.now();

      const missingOwners = new Set<string>();

      // cache codeowners for quicker lookup
      const reversedCodeowners = getPathsWithOwnersReversed();

      const testFiles = await getRepoFiles(TEST_DIRECTORIES);
      for (const { repoRel } of testFiles) {
        const owners = getCodeOwnersForFile(repoRel, reversedCodeowners);
        if (owners === undefined) {
          missingOwners.add(repoRel);
        }
      }

      const timeSpent = fmtMs(performance.now() - start);

      if (missingOwners.size) {
        log.error(
          `The following test files do not have a GitHub code owner:\n${fmtList(missingOwners)}`
        );
        throw createFailError(
          `Found ${missingOwners.size} test files without code owner (checked ${testFiles.length} test files in ${timeSpent})`
        );
      }

      log.success(
        `All test files have a code owner (checked ${testFiles.length} test files in ${timeSpent})`
      );
    },
    {
      description: 'Check that all test files are covered by GitHub CODEOWNERS',
    }
  );
}
