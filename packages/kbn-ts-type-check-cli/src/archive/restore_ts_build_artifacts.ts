/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import * as tar from 'tar';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  buildCandidateShaList,
  cleanTypeCheckArtifacts,
  isCiEnvironment,
  locateLocalArchive,
  locateRemoteArchive,
  readRecentCommitShas,
  resolveCurrentCommitSha,
} from './utils';
import { MAX_COMMITS_TO_CHECK } from './constants';

export async function restoreTSBuildArtifacts(log: SomeDevLog) {
  try {
    const currentSha = await resolveCurrentCommitSha();
    const history = await readRecentCommitShas(MAX_COMMITS_TO_CHECK);
    const candidateShas = buildCandidateShaList(currentSha, history);

    if (candidateShas.length === 0) {
      log.info('No commit history available for TypeScript cache restore.');
      return;
    }

    const archiveCandidate = isCiEnvironment()
      ? await locateRemoteArchive(log, candidateShas)
      : await locateLocalArchive(candidateShas);

    if (!archiveCandidate) {
      log.info('No cached TypeScript build artifacts available to restore.');
      return;
    }

    await cleanTypeCheckArtifacts(log);

    try {
      await tar.extract({
        file: archiveCandidate.archivePath,
        cwd: REPO_ROOT,
        gzip: true,
        strict: true,
      });
    } finally {
      if (archiveCandidate.cleanup) {
        await archiveCandidate.cleanup();
      }
    }

    log.info(`Restored TypeScript build artifacts from commit ${archiveCandidate.sha}.`);
  } catch (error) {
    const restoreErrorDetails = error instanceof Error ? error.message : String(error);
    log.warning(`Failed to restore TypeScript build artifacts: ${restoreErrorDetails}`);
  }
}
