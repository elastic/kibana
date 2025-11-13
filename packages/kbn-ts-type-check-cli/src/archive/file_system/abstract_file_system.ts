/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import Fs from 'fs';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { ArchiveMetadata } from './types';
import { COMMITS_PATH, PULL_REQUESTS_PATH, TMP_DIR } from '../constants';
import { join } from './utils';
import { cleanTypeCheckArtifacts } from '../utils';

export abstract class AbstractFileSystem {
  constructor(protected readonly log: SomeDevLog) {}

  protected abstract getPath(archiveId: string): string;

  protected abstract readMetadata(metadataPath: string): Promise<ArchiveMetadata | undefined>;
  protected abstract writeMetadata(metadataPath: string, data: ArchiveMetadata): Promise<void>;

  protected abstract hasArchive(archivePath: string): Promise<boolean>;

  protected abstract extract(archivePath: string): Promise<void>;
  protected abstract archive(archivePath: string, fileListPath: string): Promise<void>;

  public abstract clean(): Promise<void>;

  protected getArchivePath(archiveId: string) {
    return join(this.getPath(archiveId), `archive.tar.gz`);
  }

  protected getMetadataPath(archiveId: string) {
    return join(this.getPath(archiveId), `metadata.json`);
  }

  private async writeFileList(files: string[]): Promise<string> {
    // Build a null-delimited file list so tar avoids path escaping and can scan names quickly.
    // Example: find . -print0 | tar --null -T - --create …
    const fileListPath = Path.join(TMP_DIR, 'ts-artifacts.list');
    const nullDelimiter = '\0';

    const archiveEntries = files;
    const fileListContent = Buffer.from(
      `${archiveEntries.join(nullDelimiter)}${nullDelimiter}`,
      'utf8'
    );

    await Fs.promises.mkdir(TMP_DIR, { recursive: true });

    await Fs.promises.writeFile(fileListPath, fileListContent);

    return fileListPath;
  }

  public async restoreArchive(options: { shas: string[]; prNumber?: string }) {
    const prArchiveId = options.prNumber ? join(PULL_REQUESTS_PATH, options.prNumber) : undefined;

    const prArchiveMetadata = prArchiveId
      ? await this.readMetadata(this.getMetadataPath(prArchiveId))
      : undefined;

    const prSha = prArchiveMetadata?.commitSha;

    for (const sha of options.shas) {
      const archiveId = prSha && sha === prSha ? prArchiveId! : join(COMMITS_PATH, sha);

      const archivePath = this.getArchivePath(archiveId);

      if (await this.hasArchive(archivePath)) {
        await cleanTypeCheckArtifacts(this.log);
        this.log.info(`Extracting archive for ${sha}`);
        return await this.extract(archivePath);
      }
    }

    this.log.info('No cached TypeScript build artifacts available to restore.');

    return undefined;
  }

  public async updateArchive(options: { files: string[]; sha: string; prNumber?: string }) {
    const archiveId = options.prNumber
      ? join(PULL_REQUESTS_PATH, options.prNumber.toString())
      : join(COMMITS_PATH, options.sha);

    const metadata: ArchiveMetadata = {
      commitSha: options.sha,
      prNumber: options.prNumber,
    };

    const fileListPath = await this.writeFileList(options.files);

    const archivePath = this.getArchivePath(archiveId);

    this.log.info(`Writing archive to ${archivePath}`);

    await this.archive(archivePath, fileListPath);

    await this.writeMetadata(this.getMetadataPath(archiveId), metadata);
  }
}
