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
import { doHashesMatch, join } from './utils';
import { cleanTypeCheckArtifacts, calculateFileHashes } from '../utils';

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

  public async restoreArchive(options: {
    shas: string[];
    prNumber?: string;
    cacheInvalidationFiles?: string[];
  }) {
    const prArchiveId = options.prNumber ? join(PULL_REQUESTS_PATH, options.prNumber) : undefined;

    const prArchiveMetadata = prArchiveId
      ? await this.readMetadata(this.getMetadataPath(prArchiveId))
      : undefined;

    const prSha = prArchiveMetadata?.commitSha;

    // Calculate current file hashes if cache invalidation files are provided
    const currentFileHashes =
      options.cacheInvalidationFiles && options.cacheInvalidationFiles.length > 0
        ? await calculateFileHashes(options.cacheInvalidationFiles)
        : undefined;

    for (const sha of options.shas) {
      const archiveId = prSha && sha === prSha ? prArchiveId! : join(COMMITS_PATH, sha);

      const archivePath = this.getArchivePath(archiveId);
      const metadata = await this.readMetadata(this.getMetadataPath(archiveId));
      const storedFileHashes = metadata?.fileHashes;

      if (await this.hasArchive(archivePath)) {
        const hashCheckResult = doHashesMatch({
          currentFileHashes,
          storedFileHashes,
        });
        if (!hashCheckResult.result) {
          this.log.warning(
            `Cached TypeScript build artifacts for ${sha} found, but cache invalidation files have changed:\n ${hashCheckResult.message}`
          );
          return undefined;
        }

        await cleanTypeCheckArtifacts(this.log);
        this.log.info(`Extracting archive for ${sha}`);
        return await this.extract(archivePath);
      }
    }

    this.log.info('No cached TypeScript build artifacts available to restore.');

    return undefined;
  }

  public async updateArchive(options: {
    files: string[];
    sha: string;
    prNumber?: string;
    cacheInvalidationFiles?: string[];
  }) {
    const archiveId = options.prNumber
      ? join(PULL_REQUESTS_PATH, options.prNumber.toString())
      : join(COMMITS_PATH, options.sha);

    // Calculate file hashes if cache invalidation files are provided
    const fileHashes =
      options.cacheInvalidationFiles && options.cacheInvalidationFiles.length > 0
        ? await calculateFileHashes(options.cacheInvalidationFiles)
        : undefined;

    // Convert null values to undefined for JSON serialization
    const fileHashesForMetadata: Record<string, string> | undefined = fileHashes
      ? Object.fromEntries(
          Object.entries(fileHashes).filter((entry): entry is [string, string] => entry[1] !== null)
        )
      : undefined;

    const metadata: ArchiveMetadata = {
      commitSha: options.sha,
      prNumber: options.prNumber,
      fileHashes: fileHashesForMetadata,
    };

    const fileListPath = await this.writeFileList(options.files);

    const archivePath = this.getArchivePath(archiveId);

    this.log.info(`Writing archive to ${archivePath}`);

    await this.archive(archivePath, fileListPath);

    await this.writeMetadata(this.getMetadataPath(archiveId), metadata);
  }
}
