/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough } from 'stream';
import type { SomeDevLog } from '@kbn/some-dev-log';
import execa from 'execa';
import { AbstractFileSystem } from './abstract_file_system';
import { GcsFileSystem } from './gcs_file_system';

jest.mock('execa', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockExeca = execa as unknown as jest.Mock;

class ExposedGcsFileSystem extends GcsFileSystem {
  upload(archivePath: string, fileListPath: string) {
    return this.archive(archivePath, fileListPath);
  }
}

const createLog = (): SomeDevLog =>
  ({
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }) as unknown as SomeDevLog;

const asChild = (promise: Promise<unknown>) => {
  const kill = jest.fn();
  const child = promise as unknown as execa.ExecaChildProcess & { kill: jest.Mock };
  Object.assign(child, {
    stdout: new PassThrough(),
    stdin: new PassThrough(),
    stderr: new PassThrough(),
    kill,
    exitCode: null,
    killed: false,
  });
  return child;
};

describe('GcsFileSystem archive streaming', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('stops tar when gcloud token exchange is rate limited', async () => {
    let rejectUpload: (error: unknown) => void = () => undefined;
    const upload = new Promise((resolve, reject) => {
      rejectUpload = reject;
    });
    const tar = asChild(new Promise(() => undefined));
    const gcloud = asChild(upload);

    mockExeca.mockImplementation((command: string) => (command === 'tar' ? tar : gcloud));

    const pending = new ExposedGcsFileSystem(createLog()).upload(
      'gs://bucket/archive.tar.gz',
      '/tmp/files.list'
    );
    const failure = new Error('Command failed with EPIPE: gcloud storage cp');
    rejectUpload(failure);

    await expect(pending).rejects.toBe(failure);
    expect(tar.kill).toHaveBeenCalledWith('SIGKILL');
    expect(gcloud.kill).toHaveBeenCalledWith('SIGKILL');
  });
});

describe('GcsFileSystem updateArchive', () => {
  const superUpdateArchive = jest.spyOn(AbstractFileSystem.prototype, 'updateArchive');

  beforeEach(() => {
    mockExeca.mockReset();
    superUpdateArchive.mockReset().mockResolvedValue(undefined);
  });

  afterAll(() => {
    superUpdateArchive.mockRestore();
  });

  const commitPath = 'gs://ci-typescript-archives/ts_type_check/commits/abc';

  it('skips the upload when the commit archive and its metadata already exist', async () => {
    mockExeca.mockResolvedValue({ stdout: '{"commitSha":"abc"}' });

    await new GcsFileSystem(createLog()).updateArchive({ files: ['a.d.ts'], sha: 'abc' });

    expect(mockExeca).toHaveBeenCalledWith(
      'gcloud',
      ['storage', 'ls', `${commitPath}/archive.tar.gz`],
      expect.anything()
    );
    expect(mockExeca.mock.calls.map(([, [, action]]) => action)).not.toContain('cp');
    expect(superUpdateArchive).not.toHaveBeenCalled();
  });

  it('writes only the missing metadata when an earlier upload stopped after the archive', async () => {
    mockExeca.mockImplementation(async (_command: string, [, action]: string[]) => {
      if (action === 'cat') {
        throw new Error('not found');
      }
      return {};
    });

    await new GcsFileSystem(createLog()).updateArchive({ files: ['a.d.ts'], sha: 'abc' });

    expect(mockExeca).toHaveBeenCalledWith(
      'gcloud',
      ['storage', 'cp', expect.any(String), `${commitPath}/metadata.json`],
      expect.anything()
    );
    expect(superUpdateArchive).not.toHaveBeenCalled();
  });

  it('uploads a new commit archive', async () => {
    mockExeca.mockRejectedValue(new Error('not found'));

    await new GcsFileSystem(createLog()).updateArchive({ files: ['a.d.ts'], sha: 'abc' });

    expect(superUpdateArchive).toHaveBeenCalledTimes(1);
  });

  it('always uploads pull request archives', async () => {
    await new GcsFileSystem(createLog()).updateArchive({
      files: ['a.d.ts'],
      sha: 'abc',
      prNumber: '123',
    });

    expect(mockExeca).not.toHaveBeenCalled();
    expect(superUpdateArchive).toHaveBeenCalledTimes(1);
  });
});
