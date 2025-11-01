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
  getTarCreateArgs,
  isCiEnvironment,
  resolveCurrentCommitSha,
  resolveTarEnvironment,
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

  try {
    // Provide tar with a null-delimited file list to avoid path parsing overhead.
    const fileListPath = Path.join(temporaryDir, 'ts-artifacts.list');
    const nullDelimiter = '\0';
    const fileListContent = Buffer.from(`${matches.join(nullDelimiter)}${nullDelimiter}`, 'utf8');
    await Fs.promises.writeFile(fileListPath, fileListContent);

    if (isCiEnvironment()) {
      const remotePath = buildRemoteArchiveUri(commitSha);

      const tarArgs = getTarCreateArgs('-', fileListPath);

      await withGcsAuth(log, async () => {
        const tarProcess = execa('tar', tarArgs, {
          cwd: REPO_ROOT,
          stdout: 'pipe',
          stderr: 'inherit',
          env: resolveTarEnvironment(),
          buffer: false,
        });

        const uploadProcess = execa('gcloud', ['storage', 'cp', '-', remotePath], {
          cwd: REPO_ROOT,
          stdin: 'pipe',
          stdout: 'inherit',
          stderr: 'inherit',
        });

        if (!tarProcess.stdout || !uploadProcess.stdin) {
          tarProcess.kill();
          uploadProcess.kill();
          throw new Error('Failed to stream TypeScript cache archive to GCS.');
        }

        tarProcess.stdout.pipe(uploadProcess.stdin);

        await Promise.all([tarProcess, uploadProcess]);
      });

      log.info(`Streamed TypeScript build artifacts to ${remotePath}.`);
    } else {
      await ensureLocalCacheRoot();

      const archivePath = Path.join(temporaryDir, ARCHIVE_FILE_NAME);
      const tarArgs = getTarCreateArgs(archivePath, fileListPath);

      await execa('tar', tarArgs, {
        cwd: REPO_ROOT,
        stdout: 'inherit',
        stderr: 'inherit',
        env: resolveTarEnvironment(),
        buffer: false,
      });

      const destinationPath = Path.join(LOCAL_CACHE_ROOT, `${commitSha}.tar`);

      await Fs.promises.rename(archivePath, destinationPath);

      log.info(`Archived TypeScript build artifacts locally at ${destinationPath}.`);
    }
  } finally {
    await Fs.promises.rm(temporaryDir, { recursive: true, force: true });
  }
}
