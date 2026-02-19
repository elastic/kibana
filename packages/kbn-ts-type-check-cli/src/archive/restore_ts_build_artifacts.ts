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
  CACHE_IGNORE_GLOBS,
  LOCAL_CACHE_ROOT,
  TYPES_DIRECTORY_GLOB,
} from './constants';
import { GcsFileSystem } from './file_system/gcs_file_system';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  getCommitDistanceInfo,
  getGcloudAccessToken,
  getPullRequestNumber,
  isCiEnvironment,
  logArtifactFreshness,
  readMainBranchCommitShas,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
  withGcsAuth,
} from './utils';

export async function restoreTSBuildArtifacts(log: SomeDevLog) {
  try {
    // If build artifacts already exist from a previous (possibly aborted) run,
    // skip the archive restore entirely. tsc's incremental build (-b) will
    // detect which projects are up-to-date and only rebuild what's needed —
    // which is faster than wiping everything and restoring from a cache archive.
    if (!isCiEnvironment()) {
      const existingDirs = await globby(TYPES_DIRECTORY_GLOB, {
        cwd: REPO_ROOT,
        onlyDirectories: true,
        followSymbolicLinks: false,
        ignore: CACHE_IGNORE_GLOBS,
      });

      if (existingDirs.length > 0) {
        log.info(
          `Found ${existingDirs.length} existing type cache directories — skipping archive restore (tsc incremental build will handle it).`
        );
        return;
      }
    }

    log.info(`Restoring TypeScript build artifacts`);

    // Group 1: kick off all independent operations in parallel.
    // getGcloudAccessToken doubles as an availability check (~1-2s gcloud CLI
    // call) and returns the token for direct HTTP requests later, avoiding a
    // second gcloud invocation.
    const [currentSha, history, upstreamRemote, accessToken] = await Promise.all([
      resolveCurrentCommitSha(),
      readRecentCommitShas(MAX_COMMITS_TO_CHECK),
      resolveUpstreamRemote(),
      isCiEnvironment() ? Promise.resolve(undefined) : getGcloudAccessToken(),
    ]);

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
      await withGcsAuth(log, async (token) => {
        await new GcsFileSystem(log, token).restoreArchive(restoreOptions);
      });

      return;
    }

    // Local development: try GCS first (using developer's own gcloud auth),
    // then fall back to the local file system cache.
    if (accessToken) {
      log.info('gcloud auth detected, attempting to restore from GCS...');
      try {
        const gcsFs = new GcsFileSystem(log, accessToken);

        if (!upstreamRemote) {
          log.warning(
            'Could not find a git remote for elastic/kibana. ' +
              'Add one with: git remote add upstream git@github.com:elastic/kibana.git'
          );
        }

        // Group 2: fetch upstream main and list GCS archives in parallel.
        // These are both network calls (~1-3s each) that don't depend on each other.
        const fetchUpstream = upstreamRemote
          ? execa('git', ['fetch', upstreamRemote, 'main', '--quiet'], { cwd: REPO_ROOT })
              .then(() => {
                log.verbose(`Fetched latest main from ${upstreamRemote}.`);
              })
              .catch((fetchError) => {
                const details =
                  fetchError instanceof Error ? fetchError.message : String(fetchError);
                log.warning(`Failed to fetch ${upstreamRemote}/main: ${details}`);
              })
          : Promise.resolve();

        const gcsListPromise = gcsFs.listAvailableCommitShas();

        const [, availableShas] = await Promise.all([fetchUpstream, gcsListPromise]);

        if (availableShas.size === 0) {
          log.warning(
            'GCS returned 0 archives. You may not have read access to the bucket. ' +
              'Ensure you have run: gcloud auth login'
          );
        }

        // Group 3: read main branch SHAs (needs fetch to have completed).
        // CI archives artifacts under the commit SHA of each Buildkite build,
        // which is the HEAD of the PR branch (not the merge commit on main).
        // Therefore we search:
        //   1. HEAD history — includes commits CI built for the current branch
        //   2. upstream/main history — in case CI also archives main builds
        const mainShas = upstreamRemote ? await readMainBranchCommitShas(MAX_COMMITS_TO_CHECK) : [];
        const gcsCandidateShas = buildCandidateShaList(currentSha, [...history, ...mainShas]);

        const matchedShas = gcsCandidateShas.filter((sha) => availableShas.has(sha));

        if (matchedShas.length > 0) {
          const bestMatch = matchedShas[0];

          log.info(
            `Found ${
              matchedShas.length
            } matching archive(s) in GCS, restoring best match (${bestMatch.slice(0, 12)})...`
          );

          if (currentSha) {
            const distanceInfo = await getCommitDistanceInfo(currentSha, bestMatch);
            if (distanceInfo) {
              logArtifactFreshness(log, currentSha, bestMatch, distanceInfo);
            }
          }

          const gcsRestoreOptions = {
            ...restoreOptions,
            cacheInvalidationFiles: undefined,
            shas: matchedShas,
            skipExistenceCheck: true,
          };

          const restored = await gcsFs.restoreArchive(gcsRestoreOptions);

          if (restored) {
            return;
          }
        } else if (availableShas.size > 0) {
          log.info(
            `None of the ${gcsCandidateShas.length} candidate commit(s) matched ` +
              `the ${availableShas.size} archived commit(s) in GCS.`
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
      log.info('No local cache exists yet. It will be populated after this type check completes.');
      return;
    }

    await new LocalFileSystem(log).restoreArchive({
      ...restoreOptions,
      cacheInvalidationFiles: undefined,
    });
  } catch (error) {
    const restoreErrorDetails = error instanceof Error ? error.message : String(error);

    log.warning(`Failed to restore TypeScript build artifacts: ${restoreErrorDetails}`);
  }
}
