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
  ARCHIVE_METADATA_FILE_NAME,
  CACHE_IGNORE_GLOBS,
  CACHE_MATCH_GLOBS,
  LOCAL_CACHE_ROOT,
  LOCAL_METADATA_RELATIVE_PATH,
} from './constants';
import {
  buildCommitRemoteUris,
  buildPullRequestRemoteUris,
  ensureLocalCacheRoot,
  getPullRequestNumber,
  getTarCreateArgs,
  isCiEnvironment,
  mergePullRequestMetadata,
  resolveCurrentCommitSha,
  resolveTarEnvironment,
  resolveLocalMetadataPath,
  readRemotePullRequestMetadata,
  withGcsAuth,
} from './utils';

/**
 * Archives .tsbuildinfo, type_check.tsconfig.json, and declaration files
 * in a GCS bucket for cached type checks.
 */
export async function archiveTSBuildArtifacts(log: SomeDevLog) {
  const now = Date.now();

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
  let embeddedMetadataAbsolutePath: string | undefined;
  let embeddedMetadataOriginalContent: string | undefined;
  let didEmbeddedMetadataExist = false;

  try {
    // Build a null-delimited file list so tar avoids path escaping and can scan names quickly.
    // Example: find . -print0 | tar --null -T - --create …
    const fileListPath = Path.join(temporaryDir, 'ts-artifacts.list');
    const nullDelimiter = '\0';

    const prNumber = getPullRequestNumber();
    const metadata = {
      commitSha,
      createdAt: new Date().toISOString(),
      prNumber: prNumber ?? null,
    };
    const metadataContent = JSON.stringify(metadata, null, 2);

    const metadataPath = Path.join(temporaryDir, ARCHIVE_METADATA_FILE_NAME);
    await Fs.promises.writeFile(metadataPath, metadataContent);

    embeddedMetadataAbsolutePath = Path.join(REPO_ROOT, LOCAL_METADATA_RELATIVE_PATH);
    const embeddedMetadataDir = Path.dirname(embeddedMetadataAbsolutePath);
    await Fs.promises.mkdir(embeddedMetadataDir, { recursive: true });

    try {
      embeddedMetadataOriginalContent = await Fs.promises.readFile(
        embeddedMetadataAbsolutePath,
        'utf8'
      );
      didEmbeddedMetadataExist = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    await Fs.promises.writeFile(embeddedMetadataAbsolutePath, metadataContent);

    const archiveEntries = Array.from(new Set<string>([...matches, LOCAL_METADATA_RELATIVE_PATH]));
    const fileListContent = Buffer.from(
      `${archiveEntries.join(nullDelimiter)}${nullDelimiter}`,
      'utf8'
    );
    await Fs.promises.writeFile(fileListPath, fileListContent);

    if (isCiEnvironment()) {
      if (prNumber) {
        const prUris = buildPullRequestRemoteUris(prNumber);

        await withGcsAuth(log, async () => {
          const tarProcess = execa('tar', getTarCreateArgs('-', fileListPath), {
            cwd: REPO_ROOT,
            stdout: 'pipe',
            stderr: 'inherit',
            env: resolveTarEnvironment(),
            buffer: false,
          });

          const uploadProcess = execa('gcloud', ['storage', 'cp', '-', prUris.archiveUri], {
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

          const existingMetadata = await readRemotePullRequestMetadata(prUris.metadataUri);
          const mergedMetadata = mergePullRequestMetadata(prNumber, existingMetadata, metadata);
          const prMetadataPath = Path.join(temporaryDir, `pr-${ARCHIVE_METADATA_FILE_NAME}`);
          await Fs.promises.writeFile(prMetadataPath, JSON.stringify(mergedMetadata, null, 2));

          await execa('gcloud', ['storage', 'cp', prMetadataPath, prUris.metadataUri], {
            cwd: REPO_ROOT,
            stdout: 'inherit',
            stderr: 'inherit',
          });
        });

        log.info(`Streamed TypeScript build artifacts to ${prUris.archiveUri} (PR #${prNumber}).`);
      } else {
        const commitUris = buildCommitRemoteUris(commitSha);

        await withGcsAuth(log, async () => {
          const tarProcess = execa('tar', getTarCreateArgs('-', fileListPath), {
            cwd: REPO_ROOT,
            stdout: 'pipe',
            stderr: 'inherit',
            env: resolveTarEnvironment(),
            buffer: false,
          });

          const uploadProcess = execa('gcloud', ['storage', 'cp', '-', commitUris.archiveUri], {
            cwd: REPO_ROOT,
            stdin: 'pipe',
            stdout: 'inherit',
            stderr: 'inherit',
          });

          tarProcess.stdout!.pipe(uploadProcess.stdin!);

          await Promise.all([tarProcess, uploadProcess]);

          await execa('gcloud', ['storage', 'cp', metadataPath, commitUris.metadataUri], {
            cwd: REPO_ROOT,
            stdout: 'inherit',
            stderr: 'inherit',
          });
        });

        const tookInMs = Math.round(Date.now() - now);

        log.info(`Streamed TypeScript build artifacts to ${commitUris.archiveUri} in ${tookInMs}.`);
      }
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

      const destinationMetadataPath = resolveLocalMetadataPath(commitSha);
      await Fs.promises.writeFile(destinationMetadataPath, metadataContent);

      const tookInMs = Math.round(Date.now() - now);

      log.info(
        `Archived TypeScript build artifacts locally at ${destinationPath} in ${tookInMs}ms.`
      );
    }
  } finally {
    if (embeddedMetadataAbsolutePath) {
      try {
        if (didEmbeddedMetadataExist && embeddedMetadataOriginalContent !== undefined) {
          await Fs.promises.writeFile(
            embeddedMetadataAbsolutePath,
            embeddedMetadataOriginalContent
          );
        } else {
          await Fs.promises.rm(embeddedMetadataAbsolutePath, { force: true });
        }
      } catch (cleanupError) {
        const details = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        log.warning(`Failed to clean up staged metadata file: ${details}`);
      }
    }

    await Fs.promises.rm(temporaryDir, { recursive: true, force: true });
  }
}
