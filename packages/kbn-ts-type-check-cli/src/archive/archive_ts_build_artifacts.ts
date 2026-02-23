/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import globby from 'globby';
import { CACHE_IGNORE_GLOBS, CACHE_MATCH_GLOBS, CACHE_INVALIDATION_FILES } from './constants';
import { GcsFileSystem } from './file_system/gcs_file_system';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  getPullRequestNumber,
  isCiEnvironment,
  resolveCurrentCommitSha,
  withGcsAuth,
} from './utils';

/**
 * Archives .tsbuildinfo, type_check.tsconfig.json, and declaration files
 * in a GCS bucket for cached type checks.
 */
export async function archiveTSBuildArtifacts(log: SomeDevLog) {
  try {
    const matches = await globby(CACHE_MATCH_GLOBS, {
      cwd: REPO_ROOT,
      dot: true,
      followSymbolicLinks: false,
      ignore: CACHE_IGNORE_GLOBS,
    });

    if (matches.length === 0) {
      log.info('No TypeScript build artifacts found to archive.');
      return;
    }

    const commitSha = await resolveCurrentCommitSha();

    if (!commitSha) {
      log.warning('Unable to determine commit SHA for TypeScript cache archive.');
      return;
    }

    const prNumber = getPullRequestNumber();

    const options = {
      files: matches,
      sha: commitSha,
      prNumber,
      cacheInvalidationFiles: CACHE_INVALIDATION_FILES,
    };

    if (isCiEnvironment()) {
      await withGcsAuth(log, () => new GcsFileSystem(log).updateArchive(options));
    } else {
      await new LocalFileSystem(log).updateArchive(options);
    }
  } catch (error) {
    const archiveErrorDetails = error instanceof Error ? error.message : String(error);
    log.warning(`Failed to archive TypeScript build artifacts: ${archiveErrorDetails}`);
  }
}
