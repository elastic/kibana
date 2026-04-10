/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { TMP_DIR } from '../constants';
import type { ArchiveMetadata } from './types';
import { AbstractFileSystem } from './abstract_file_system';

jest.mock('../utils', () => ({
  cleanTypeCheckArtifacts: jest.fn(),
  calculateFileHashes: jest.fn().mockResolvedValue({
    'yarn.lock': 'hash1',
  }),
}));

const { cleanTypeCheckArtifacts } = jest.requireMock('../utils') as {
  cleanTypeCheckArtifacts: jest.MockedFunction<(log: SomeDevLog) => Promise<void>>;
};

class TestFileSystem extends AbstractFileSystem {
  public readonly archiveCalls: Array<{ archivePath: string; fileListPath: string }> = [];
  public readonly extractCalls: string[] = [];
  public readonly metadata = new Map<string, ArchiveMetadata>();
  public readonly availableArchives = new Set<string>();

  protected getPath(archiveId: string): string {
    return archiveId;
  }

  protected async readMetadata(metadataPath: string): Promise<ArchiveMetadata | undefined> {
    return this.metadata.get(metadataPath);
  }

  protected async writeMetadata(metadataPath: string, data: ArchiveMetadata): Promise<void> {
    this.metadata.set(metadataPath, data);
  }

  protected async hasArchive(archivePath: string): Promise<boolean> {
    return this.availableArchives.has(archivePath);
  }

  protected async extract(archivePath: string): Promise<void> {
    this.extractCalls.push(archivePath);
  }

  protected async archive(archivePath: string, fileListPath: string): Promise<void> {
    this.archiveCalls.push({ archivePath, fileListPath });
  }

  public async clean(): Promise<void> {
    return Promise.resolve();
  }
}

const createLog = (): SomeDevLog => {
  return {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as SomeDevLog;
};

describe('AbstractFileSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanTypeCheckArtifacts.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await Fs.promises.rm(TMP_DIR, { recursive: true, force: true });
  });

  describe('updateArchive', () => {
    it('writes a null-delimited file list and metadata for commit archives', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);

      await fs.updateArchive({ files: ['foo', 'bar'], sha: 'abcd1234' });

      expect(fs.archiveCalls).toHaveLength(1);
      const [{ archivePath, fileListPath }] = fs.archiveCalls;
      expect(archivePath).toBe('commits/abcd1234/archive.tar.gz');

      const fileListContent = await Fs.promises.readFile(fileListPath, 'utf8');
      expect(fileListContent).toBe('foo\u0000bar\u0000');

      expect(fs.metadata.get('commits/abcd1234/metadata.json')).toEqual({
        commitSha: 'abcd1234',
        prNumber: undefined,
      });
    });

    it('stores metadata including PR number for pull request archives', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);

      await fs.updateArchive({ files: ['one'], sha: 'commitsha', prNumber: '42' });

      expect(fs.archiveCalls).toHaveLength(1);
      const [{ archivePath }] = fs.archiveCalls;
      expect(archivePath).toBe('prs/42/archive.tar.gz');

      expect(fs.metadata.get('prs/42/metadata.json')).toEqual({
        commitSha: 'commitsha',
        prNumber: '42',
      });
    });

    it('stores file hashes when cache invalidation files are provided', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);

      await fs.updateArchive({
        files: ['fileA', 'fileB'],
        sha: 'sha-with-hashes',
        cacheInvalidationFiles: ['yarn.lock'],
      });

      expect(fs.metadata.get('commits/sha-with-hashes/metadata.json')).toEqual({
        commitSha: 'sha-with-hashes',
        prNumber: undefined,
        fileHashes: { 'yarn.lock': 'hash1' },
      });
    });
  });

  describe('restoreArchive', () => {
    it('extracts the first matching archive and cleans existing artifacts', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);
      fs.availableArchives.add('commits/sha2/archive.tar.gz');

      await fs.restoreArchive({ shas: ['sha1', 'sha2', 'sha3'] });

      expect(cleanTypeCheckArtifacts).toHaveBeenCalledTimes(1);
      expect(cleanTypeCheckArtifacts).toHaveBeenCalledWith(log);
      expect(fs.extractCalls).toEqual(['commits/sha2/archive.tar.gz']);
    });

    it('prefers the pull request archive when metadata matches the candidate SHA', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);
      fs.metadata.set('prs/123/metadata.json', { commitSha: 'sha-pr', prNumber: '123' });
      fs.availableArchives.add('prs/123/archive.tar.gz');

      await fs.restoreArchive({ shas: ['sha-pr', 'sha-other'], prNumber: '123' });

      expect(cleanTypeCheckArtifacts).toHaveBeenCalledTimes(1);
      expect(fs.extractCalls).toEqual(['prs/123/archive.tar.gz']);
    });

    it('logs when no archive could be restored', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);

      await fs.restoreArchive({ shas: ['missing-one'] });

      expect(fs.extractCalls).toHaveLength(0);
      expect(cleanTypeCheckArtifacts).not.toHaveBeenCalled();
      expect((log.info as jest.Mock).mock.calls).toContainEqual([
        'No cached TypeScript build artifacts available to restore.',
      ]);
    });

    it('logs a warning when cache invalidation files have changed', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);
      fs.metadata.set('commits/shaX/metadata.json', {
        commitSha: 'shaX',
        prNumber: undefined,
        fileHashes: { 'yarn.lock': 'oldhash' },
      });
      fs.availableArchives.add('commits/shaX/archive.tar.gz');

      await fs.restoreArchive({
        shas: ['shaX'],
        cacheInvalidationFiles: ['yarn.lock'],
      });

      expect(fs.extractCalls).toHaveLength(0);
      expect(cleanTypeCheckArtifacts).not.toHaveBeenCalled();
      expect((log.warning as jest.Mock).mock.calls).toContainEqual([
        expect.stringContaining(
          'Cached TypeScript build artifacts for shaX found, but cache invalidation files have changed:'
        ),
      ]);
    });

    it('proceeds with restore if hashes match', async () => {
      const log = createLog();
      const fs = new TestFileSystem(log);
      fs.metadata.set('commits/shaY/metadata.json', {
        commitSha: 'shaY',
        prNumber: undefined,
        fileHashes: { 'yarn.lock': 'hash1' },
      });
      fs.availableArchives.add('commits/shaY/archive.tar.gz');

      await fs.restoreArchive({
        shas: ['shaY'],
        cacheInvalidationFiles: ['yarn.lock'],
      });

      expect(cleanTypeCheckArtifacts).toHaveBeenCalledTimes(1);
      expect(fs.extractCalls).toEqual(['commits/shaY/archive.tar.gz']);
    });
  });
});
