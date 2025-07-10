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

const TEST_DIRECTORIES = [
  'test',
  'x-pack/test',
  'x-pack/test_serverless',
  'src/platform/test',
  'x-pack/platform/test',
  'x-pack/solutions/search/test',
  'x-pack/solutions/observability/test',
  'x-pack/solutions/security/test',
];

export async function checkFTRCodeOwnersCLI() {
  await run(
    async ({ log }) => {
      const matcher = ignore().add(
        getCodeOwnersEntries()
          .filter((entry) => entry.teams.length > 0)
          .map((entry) => entry.pattern)
      );
      const hasOwner = (path: string): boolean => matcher.test(path).ignored;

      const testFiles = await getRepoFiles(TEST_DIRECTORIES);
      const filesWithoutOwner = testFiles
        .filter((repoPath) => !hasOwner(repoPath.repoRel))
        .map((repoPath) => repoPath.repoRel);

      log.info(`Checked ${testFiles.length} test files in ${process.uptime().toFixed(2)}s`);

      if (filesWithoutOwner.length === 0) {
        log.success(`All test files have a code owner 🥳`);
        return;
      }

      log.write('Test files without a code owner:');
      log.write(filesWithoutOwner.map((i) => ` - ${i}`).join('\n'));
      throw createFailError(`Found ${filesWithoutOwner.length} test files without code owner`);
    },
    {
      description: 'Check that all test files are covered by GitHub CODEOWNERS',
    }
  );
}
