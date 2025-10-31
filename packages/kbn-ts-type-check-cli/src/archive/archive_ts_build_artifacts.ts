/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import Path from 'path';
import Os from 'os';
import type { SomeDevLog } from '@kbn/some-dev-log';
import globby from 'globby';
import { REPO_ROOT } from '@kbn/repo-info';
import type { TarOptionsWithAliasesAsyncFile } from 'tar';
import * as tar from 'tar';
import execa from 'execa';
import {
  ARCHIVE_FILE_NAME,
  CACHE_IGNORE_GLOBS,
  CACHE_MATCH_GLOBS,
  LOCAL_CACHE_ROOT,
} from './constants';
import {
  buildRemoteArchiveUri,
  ensureLocalCacheRoot,
  isCiEnvironment,
  resolveCurrentCommitSha,
  withGcsAuth,
} from './utils';

export async function archiveTSBuildArtifacts(log: SomeDevLog) {
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

  const temporaryDir = await Fs.promises.mkdtemp(Path.join(Os.tmpdir(), 'kbn-ts-cache-'));

  const archivePath = Path.join(temporaryDir, ARCHIVE_FILE_NAME);

  const tarOptions: TarOptionsWithAliasesAsyncFile = {
    cwd: REPO_ROOT,
    gzip: true,
    file: archivePath,
    portable: true,
  };

  await tar.create(tarOptions, matches);

  if (isCiEnvironment()) {
    const remotePath = buildRemoteArchiveUri(commitSha);

    await withGcsAuth(log, async () => {
      await execa('gcloud', ['storage', 'cp', archivePath, remotePath], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
      return undefined;
    });

    log.info(`Uploaded TypeScript build artifacts to ${remotePath}.`);
  } else {
    await ensureLocalCacheRoot();

    const destinationPath = Path.join(LOCAL_CACHE_ROOT, `${commitSha}.tar.gz`);

    await Fs.promises.rename(archivePath, destinationPath);

    log.info(`Archived TypeScript build artifacts locally at ${destinationPath}.`);
  }
}
