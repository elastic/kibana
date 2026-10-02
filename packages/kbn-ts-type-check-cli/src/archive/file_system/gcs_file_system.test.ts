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
