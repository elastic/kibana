/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import execa from 'execa';
import { GCS_BUCKET_URI } from '../constants';
import { getTarCreateArgs, getTarPlatformOptions, resolveTarEnvironment } from './utils';
import { AbstractFileSystem } from './abstract_file_system';
import type { ArchiveMetadata } from './types';
import { join } from './utils';

export class GcsFileSystem extends AbstractFileSystem {
  constructor(log: SomeDevLog) {
    super(log);
  }

  protected getPath(archiveId: string): string {
    return join(GCS_BUCKET_URI, archiveId);
  }

  protected async archive(archivePath: string, fileListPath: string): Promise<void> {
    const tarProcess = execa('tar', getTarCreateArgs('-', fileListPath), {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'inherit',
      env: resolveTarEnvironment(),
      buffer: false,
    });

    const uploadProcess = execa('gcloud', ['storage', 'cp', '-', archivePath], {
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
  }

  protected async extract(archivePath: string): Promise<void> {
    this.log.info(`Streaming TypeScript build artifacts from ${archivePath}`);

    const extractBaseArgs = ['--directory', REPO_ROOT, ...getTarPlatformOptions()];

    const tarArgs = ['--extract', '--file', '-', '--gzip', ...extractBaseArgs];

    const tarProcess = execa('tar', tarArgs, {
      cwd: REPO_ROOT,
      stdin: 'pipe',
      stdout: 'ignore',
      stderr: 'inherit',
      env: resolveTarEnvironment(),
      buffer: false,
    });

    const catProcess = execa('gcloud', ['storage', 'cat', archivePath], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'inherit',
      buffer: false,
    });

    if (!catProcess.stdout || !tarProcess.stdin) {
      tarProcess.kill();
      catProcess.kill();
      throw new Error('Failed to establish stream between gcloud and tar.');
    }

    catProcess.stdout.pipe(tarProcess.stdin);

    await Promise.all([catProcess, tarProcess]);
  }

  protected async hasArchive(archivePath: string): Promise<boolean> {
    const commands: Array<[cmd: string, args: string[]]> = [
      ['gcloud', ['storage', 'ls', '--uri', archivePath]],
      ['gsutil', ['-q', 'ls', archivePath]],
    ];

    for (const [cmd, args] of commands) {
      try {
        await execa(cmd, args, {
          cwd: REPO_ROOT,
          stdio: 'ignore',
        });
        return true;
      } catch (error) {
        continue;
      }
    }

    return false;
  }

  protected async readMetadata(metadataPath: string): Promise<ArchiveMetadata | undefined> {
    const commands: Array<[cmd: string, args: string[]]> = [
      ['gcloud', ['storage', 'cat', metadataPath]],
      ['gsutil', ['cat', metadataPath]],
    ];

    for (const [cmd, args] of commands) {
      try {
        const { stdout } = await execa(cmd, args, {
          cwd: REPO_ROOT,
          stderr: 'ignore',
        });
        return JSON.parse(stdout) as ArchiveMetadata;
      } catch (error) {
        continue;
      }
    }

    return undefined;
  }

  protected async writeMetadata(metadataPath: string, data: ArchiveMetadata): Promise<void> {
    const tempDir = await Fs.promises.mkdtemp(Path.join(Os.tmpdir(), 'kbn-ts-metadata-'));
    const tempFilePath = Path.join(tempDir, 'metadata.json');

    try {
      await Fs.promises.writeFile(tempFilePath, JSON.stringify(data), 'utf8');

      await execa('gcloud', ['storage', 'cp', tempFilePath, metadataPath], {
        cwd: REPO_ROOT,
        stdout: 'inherit',
        stderr: 'inherit',
      });
    } finally {
      await Fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }

  async clean(): Promise<void> {
    // do nothing
  }
}
