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
import {
  GCS_BUCKET_NAME,
  GCS_BUCKET_PATH,
  GCS_BUCKET_URI,
  GCS_COMMITS_PREFIX,
  COMMITS_PATH,
} from '../constants';
import { getTarCreateArgs, getTarPlatformOptions, resolveTarEnvironment } from './utils';
import { AbstractFileSystem } from './abstract_file_system';
import type { ArchiveMetadata } from './types';
import { join } from './utils';

/**
 * Convert a `gs://bucket/path` URI to the equivalent authenticated HTTPS URL
 * supported by Google Cloud Storage for direct downloads.
 */
function gsUriToHttpsUrl(gsUri: string): string {
  return gsUri.replace(/^gs:\/\//, 'https://storage.googleapis.com/');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class GcsFileSystem extends AbstractFileSystem {
  private accessToken: string | undefined;

  /**
   * @param accessToken  When provided, GCS operations use direct HTTP requests
   *   (via `curl`) instead of the `gcloud` CLI. This eliminates ~2-3 seconds
   *   of Python CLI startup overhead per invocation.  Pass `undefined` to use
   *   the original `gcloud`-based implementation for comparison.
   */
  constructor(log: SomeDevLog, accessToken?: string) {
    super(log);
    this.accessToken = accessToken;
  }

  protected getPath(archiveId: string): string {
    return join(GCS_BUCKET_URI, archiveId);
  }

  // ---------------------------------------------------------------------------
  // Archive creation (unchanged — only used on CI via gcloud service account)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Extract — download + decompress the tar.gz archive
  // ---------------------------------------------------------------------------

  protected async extract(archivePath: string): Promise<void> {
    if (this.accessToken) {
      return this.extractDirect(archivePath, this.accessToken);
    }
    return this.extractWithGcloud(archivePath);
  }

  /** Original implementation: `gcloud storage cat | tar xz` */
  private async extractWithGcloud(archivePath: string): Promise<void> {
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

  /**
   * Fast implementation that splits download and extraction into two measured
   * steps so the user can see where time is actually spent.
   *
   * 1. `curl` downloads the archive to a temp file (network-bound).
   * 2. `tar xzf` extracts from that file (disk I/O-bound).
   *
   * This also means a failed extraction doesn't require re-downloading.
   */
  private async extractDirect(archivePath: string, token: string): Promise<void> {
    const url = gsUriToHttpsUrl(archivePath);
    const tmpFile = Path.join(Os.tmpdir(), `kbn-ts-archive-${Date.now()}.tar.gz`);

    try {
      // -- Step 1: Download ------------------------------------------------
      const dlStart = Date.now();
      await execa('curl', ['-sSLf', '-o', tmpFile, '-H', `Authorization: Bearer ${token}`, url], {
        stderr: 'pipe',
      });
      const dlElapsed = Date.now() - dlStart;

      let sizeBytes: number | undefined;
      try {
        const stat = await Fs.promises.stat(tmpFile);
        sizeBytes = stat.size;
      } catch {
        // stat failed — proceed without size info
      }

      const sizeLabel = sizeBytes ? ` (${formatBytes(sizeBytes)})` : '';
      const speedLabel =
        sizeBytes && dlElapsed > 0
          ? ` at ${formatBytes(Math.round(sizeBytes / (dlElapsed / 1000)))}/s`
          : '';
      this.log.info(
        `Downloaded TypeScript build artifacts${sizeLabel} in ${(dlElapsed / 1000).toFixed(
          1
        )}s${speedLabel}`
      );

      // -- Step 2: Extract -------------------------------------------------
      const exStart = Date.now();
      this.log.info('Extracting archive to disk...');

      const tarArgs = [
        '--extract',
        '--file',
        tmpFile,
        '--gzip',
        '--directory',
        REPO_ROOT,
        ...getTarPlatformOptions(),
      ];

      await execa('tar', tarArgs, {
        cwd: REPO_ROOT,
        stdout: 'ignore',
        stderr: 'inherit',
        env: resolveTarEnvironment(),
      });

      const exElapsed = Date.now() - exStart;
      this.log.info(`Extracted TypeScript build artifacts in ${(exElapsed / 1000).toFixed(1)}s`);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to restore archive from GCS: ${details.replace(token, '<redacted>')}`
      );
    } finally {
      // Clean up the temp file regardless of success or failure.
      await Fs.promises.rm(tmpFile, { force: true }).catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // hasArchive (unchanged — skipped when skipExistenceCheck is true)
  // ---------------------------------------------------------------------------

  protected async hasArchive(archivePath: string): Promise<boolean> {
    const commands: Array<[cmd: string, args: string[]]> = [
      ['gcloud', ['storage', 'ls', '--uri', archivePath]],
      ['gsutil', ['-q', 'ls', archivePath]],
    ];

    for (const [cmd, args] of commands) {
      const start = Date.now();

      try {
        await execa(cmd, args, {
          cwd: REPO_ROOT,
          stdio: 'ignore',
        });

        this.log.verbose(`  hasArchive(${cmd}): found (${Date.now() - start}ms)`);

        return true;
      } catch (error) {
        this.log.verbose(`  hasArchive(${cmd}): not found (${Date.now() - start}ms)`);

        continue;
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Read metadata — fetch the small JSON metadata file for a given archive
  // ---------------------------------------------------------------------------

  protected async readMetadata(metadataPath: string): Promise<ArchiveMetadata | undefined> {
    if (this.accessToken) {
      return this.readMetadataDirect(metadataPath, this.accessToken);
    }
    return this.readMetadataWithGcloud(metadataPath);
  }

  /** Original implementation: tries `gcloud storage cat`, falls back to `gsutil cat`. */
  private async readMetadataWithGcloud(metadataPath: string): Promise<ArchiveMetadata | undefined> {
    const commands: Array<[cmd: string, args: string[]]> = [
      ['gcloud', ['storage', 'cat', metadataPath]],
      ['gsutil', ['cat', metadataPath]],
    ];

    for (const [cmd, args] of commands) {
      const start = Date.now();

      try {
        const { stdout } = await execa(cmd, args, {
          cwd: REPO_ROOT,
          stderr: 'ignore',
        });

        this.log.verbose(`  readMetadata(${cmd}): success (${Date.now() - start}ms)`);

        return JSON.parse(stdout) as ArchiveMetadata;
      } catch (error) {
        this.log.verbose(`  readMetadata(${cmd}): failed (${Date.now() - start}ms)`);
        continue;
      }
    }

    return undefined;
  }

  /** Fast implementation: `curl` — skips ~2-3s of gcloud CLI startup for a ~300-byte JSON file. */
  private async readMetadataDirect(
    metadataPath: string,
    token: string
  ): Promise<ArchiveMetadata | undefined> {
    const url = gsUriToHttpsUrl(metadataPath);
    const start = Date.now();

    try {
      const { stdout } = await execa(
        'curl',
        ['-sSLf', '-H', `Authorization: Bearer ${token}`, url],
        { stderr: 'ignore' }
      );

      this.log.verbose(`  readMetadata(curl): success (${Date.now() - start}ms)`);

      return JSON.parse(stdout) as ArchiveMetadata;
    } catch (error) {
      this.log.verbose(`  readMetadata(curl): failed (${Date.now() - start}ms)`);
      return undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // Write metadata (unchanged — only used on CI)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // List available commit SHAs in GCS
  // ---------------------------------------------------------------------------

  async listAvailableCommitShas(): Promise<Set<string>> {
    if (this.accessToken) {
      return this.listAvailableCommitShasDirect(this.accessToken);
    }
    return this.listAvailableCommitShasWithGcloud();
  }

  /** Original implementation: `gcloud storage ls`. */
  private async listAvailableCommitShasWithGcloud(): Promise<Set<string>> {
    const prefix = `${GCS_COMMITS_PREFIX}/`;
    const start = Date.now();

    try {
      const { stdout } = await execa('gcloud', ['storage', 'ls', prefix], {
        cwd: REPO_ROOT,
        stderr: 'ignore',
      });

      const shas = new Set<string>();
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith(prefix)) {
          continue;
        }
        // Lines look like: gs://ci-typescript-archives/ts_type_check/commits/<sha>/
        const sha = trimmed.slice(prefix.length).replace(/\/$/, '');
        if (sha.length > 0) {
          shas.add(sha);
        }
      }

      this.log.info(
        `Listed ${shas.size} available archive(s) from GCS via gcloud (${Date.now() - start}ms)`
      );
      return shas;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.log.verbose(`Failed to list GCS archives: ${details} (${Date.now() - start}ms)`);
      return new Set();
    }
  }

  /**
   * Fast implementation: GCS JSON API via `curl`.
   * Hits `storage.googleapis.com/storage/v1/b/{bucket}/o` with a prefix and
   * delimiter, avoiding the ~3-4s gcloud CLI startup.
   */
  private async listAvailableCommitShasDirect(token: string): Promise<Set<string>> {
    const objectPrefix = `${GCS_BUCKET_PATH}/${COMMITS_PATH}/`;
    const baseUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET_NAME}/o`;
    const start = Date.now();

    try {
      const shas = new Set<string>();
      let pageToken: string | undefined;

      do {
        const params = new URLSearchParams({
          prefix: objectPrefix,
          delimiter: '/',
          maxResults: '1000',
        });
        if (pageToken) {
          params.set('pageToken', pageToken);
        }

        const url = `${baseUrl}?${params}`;
        const { stdout } = await execa(
          'curl',
          ['-sSLf', '-H', `Authorization: Bearer ${token}`, url],
          { stderr: 'ignore' }
        );

        const data = JSON.parse(stdout) as {
          prefixes?: string[];
          nextPageToken?: string;
        };

        if (data.prefixes) {
          for (const p of data.prefixes) {
            const sha = p.slice(objectPrefix.length).replace(/\/$/, '');
            if (sha.length > 0) {
              shas.add(sha);
            }
          }
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      this.log.info(
        `Listed ${shas.size} available archive(s) from GCS via API (${Date.now() - start}ms)`
      );
      return shas;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.log.verbose(
        `Failed to list GCS archives via API: ${details.replace(token, '<redacted>')} (${
          Date.now() - start
        }ms)`
      );
      return new Set();
    }
  }

  async clean(): Promise<void> {
    // do nothing
  }
}
