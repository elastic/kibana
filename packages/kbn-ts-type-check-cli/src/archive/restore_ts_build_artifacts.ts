/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import execa from 'execa';
import globby from 'globby';
import {
  MAX_COMMITS_TO_CHECK,
  CACHE_INVALIDATION_FILES,
  CACHE_MATCH_GLOBS,
  CACHE_IGNORE_GLOBS,
  LOCAL_CACHE_ROOT,
} from './constants';
import { GcsFileSystem } from './file_system/gcs_file_system';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  getPullRequestNumber,
  isGcloudAvailable,
  isCiEnvironment,
  readMainBranchCommitShas,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
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
    const restoreOptions = {
      shas: candidateShas,
      prNumber,
      cacheInvalidationFiles: CACHE_INVALIDATION_FILES,
    };

    if (isCiEnvironment()) {
      await withGcsAuth(log, async () => {
        await new GcsFileSystem(log).restoreArchive(restoreOptions);
      });

      return;
    }

    // Local development: try GCS first (using developer's own gcloud auth),
    // then fall back to the local file system cache.
    if (await isGcloudAvailable()) {
      log.info('gcloud CLI detected, attempting to restore from GCS...');
      try {
        const gcsFs = new GcsFileSystem(log);

        // Find the remote pointing to elastic/kibana (handles forks where
        // origin is the user's fork and upstream is elastic/kibana).
        const upstreamRemote = await resolveUpstreamRemote();
        if (!upstreamRemote) {
          log.warning(
            'Could not find a git remote for elastic/kibana. ' +
              'Add one with: git remote add upstream git@github.com:elastic/kibana.git'
          );
        }

        // Fetch the latest main from upstream so we have fresh SHAs to match against GCS.
        if (upstreamRemote) {
          try {
            log.info(`Fetching latest main from ${upstreamRemote}...`);
            await execa('git', ['fetch', upstreamRemote, 'main', '--quiet'], {
              cwd: REPO_ROOT,
            });
          } catch (fetchError) {
            const details = fetchError instanceof Error ? fetchError.message : String(fetchError);

            log.warning(`Failed to fetch ${upstreamRemote}/main: ${details}`);
          }
        }

        // List available archives in GCS with a single gcloud command,
        // then intersect with upstream main candidates locally.
        const mainShas = upstreamRemote ? await readMainBranchCommitShas(MAX_COMMITS_TO_CHECK) : [];
        const gcsCandidateShas = buildCandidateShaList(currentSha, mainShas);
        const availableShas = await gcsFs.listAvailableCommitShas();

        if (availableShas.size === 0) {
          log.warning(
            'GCS returned 0 archives. You may not have read access to the bucket. ' +
              'Ensure you have run: gcloud auth login'
          );
        }

        const matchedShas = gcsCandidateShas.filter((sha) => availableShas.has(sha));

        if (matchedShas.length > 0) {
          log.info(
            `Found ${
              matchedShas.length
            } matching archive(s) in GCS, restoring best match (${matchedShas[0].slice(0, 12)})...`
          );

          const gcsRestoreOptions = {
            ...restoreOptions,
            shas: matchedShas,
          };

          const restored = await gcsFs.restoreArchive(gcsRestoreOptions);

          if (restored) {
            await cacheArtifactsLocally(log, currentSha ?? matchedShas[0], prNumber);

            return;
          }
        } else if (availableShas.size > 0 && upstreamRemote) {
          log.info(
            `None of the ${gcsCandidateShas.length} candidate commit(s) from ${upstreamRemote}/main matched ` +
              `the ${availableShas.size} archived commit(s) in GCS. ` +
              `Try: git fetch ${upstreamRemote} main`
          );
        }

        log.info('Falling back to local cache.');
      } catch (gcsError) {
        const gcsErrorDetails = gcsError instanceof Error ? gcsError.message : String(gcsError);

        log.warning(`GCS restore failed (${gcsErrorDetails}), falling back to local cache.`);
      }
    } else {
      log.verbose('gcloud CLI not available or not authenticated, using local cache only.');
    }

    try {
      await Fs.promises.access(LOCAL_CACHE_ROOT);
    } catch {
      log.info(
        'No local cache exists yet. Run with --with-archive after a successful type check to populate it.'
      );
      return;
    }

    await new LocalFileSystem(log).restoreArchive(restoreOptions);
  } catch (error) {
    const restoreErrorDetails = error instanceof Error ? error.message : String(error);

    log.warning(`Failed to restore TypeScript build artifacts: ${restoreErrorDetails}`);
  }
}

/**
 * After a successful GCS restore, snapshot the extracted artifacts into the
 * local file system cache so that subsequent offline runs can reuse them.
 */
async function cacheArtifactsLocally(log: SomeDevLog, commitSha: string, prNumber?: string) {
  try {
    const files = await globby(CACHE_MATCH_GLOBS, {
      cwd: REPO_ROOT,
      dot: true,
      followSymbolicLinks: false,
      ignore: CACHE_IGNORE_GLOBS,
    });

    if (files.length === 0) {
      log.verbose('No artifacts to cache locally after GCS restore.');
      return;
    }

    log.info(`Caching ${files.length} restored artifacts to local file system...`);
    await new LocalFileSystem(log).updateArchive({
      files,
      sha: commitSha,
      prNumber,
      cacheInvalidationFiles: CACHE_INVALIDATION_FILES,
    });
  } catch (cacheError) {
    const details = cacheError instanceof Error ? cacheError.message : String(cacheError);
    log.warning(`Failed to cache GCS artifacts locally: ${details}`);
  }
}
