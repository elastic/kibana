/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import { MAX_COMMITS_TO_CHECK, CACHE_INVALIDATION_FILES } from './constants';
import { GcsFileSystem } from './file_system/gcs_file_system';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  getPullRequestNumber,
  isCiEnvironment,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  withGcsAuth,
} from './utils';

export async function restoreTSBuildArtifacts(log: SomeDevLog) {
  try {
    log.info(`Restoring TypeScript build artifacts`);
    const currentSha = await resolveCurrentCommitSha();
    const history = await readRecentCommitShas(MAX_COMMITS_TO_CHECK);
    const candidateShas = buildCandidateShaList(currentSha, history);

    if (candidateShas.length === 0) {
      log.info('No commit history available for TypeScript cache restore.');
      return;
    }

    const prNumber = getPullRequestNumber();

    if (isCiEnvironment()) {
      await withGcsAuth(log, async () => {
        await new GcsFileSystem(log).restoreArchive({
          shas: candidateShas,
          prNumber,
          cacheInvalidationFiles: CACHE_INVALIDATION_FILES,
        });
      });
    } else {
      await new LocalFileSystem(log).restoreArchive({
        shas: candidateShas,
        prNumber,
        cacheInvalidationFiles: CACHE_INVALIDATION_FILES,
      });
    }
  } catch (error) {
    const restoreErrorDetails = error instanceof Error ? error.message : String(error);
    log.warning(`Failed to restore TypeScript build artifacts: ${restoreErrorDetails}`);
  }
}
