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
import execa from 'execa';
import Fs from 'fs';
import Path from 'path';
import { getTarCreateArgs, getTarPlatformOptions, resolveTarEnvironment } from './utils';
import { AbstractFileSystem } from './abstract_file_system';
import type { ArchiveMetadata } from './types';
import { join } from './utils';
import { LOCAL_CACHE_ROOT } from '../constants';

export class LocalFileSystem extends AbstractFileSystem {
  private readonly basePath = LOCAL_CACHE_ROOT;
  constructor(log: SomeDevLog) {
    super(log);
  }

  protected getPath(archiveId: string): string {
    return join(this.basePath, archiveId);
  }

  protected async ensureArchiveDir(path: string): Promise<void> {
    await Fs.promises.mkdir(Path.dirname(path), { recursive: true });
  }

  protected async archive(archivePath: string, fileListPath: string): Promise<void> {
    await this.ensureArchiveDir(archivePath);

    const tarArgs = getTarCreateArgs(archivePath, fileListPath);

    await execa('tar', tarArgs, {
      cwd: REPO_ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      env: resolveTarEnvironment(),
      buffer: false,
    });
  }

  protected async extract(archivePath: string): Promise<void> {
    const extractBaseArgs = ['--directory', REPO_ROOT, ...getTarPlatformOptions()];

    const tarArgs = ['--extract', '--file', archivePath, '--gzip', ...extractBaseArgs];

    await execa('tar', tarArgs, {
      cwd: REPO_ROOT,
      stdout: 'ignore',
      stderr: 'inherit',
      env: resolveTarEnvironment(),
      buffer: false,
    });
  }

  protected async readMetadata(metadataPath: string): Promise<ArchiveMetadata | undefined> {
    try {
      const contents = await Fs.promises.readFile(metadataPath, 'utf8');
      return JSON.parse(contents) as ArchiveMetadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  protected async writeMetadata(metadataPath: string, data: ArchiveMetadata): Promise<void> {
    await this.ensureArchiveDir(metadataPath);

    await Fs.promises.writeFile(metadataPath, JSON.stringify(data), 'utf8');
  }

  protected async hasArchive(archivePath: string): Promise<boolean> {
    try {
      const stat = await Fs.promises.stat(archivePath);
      return stat.isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      return false;
    }
  }

  async clean(): Promise<void> {
    await Fs.promises.rm(this.basePath, { recursive: true, force: true });
  }
}
