/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'node:fs';
import { execFileSync } from 'child_process';
import { runBumpDiff } from './run_bump_diff';
import { BumpServiceError } from './errors';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

describe('runBumpDiff', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when basePath is not absolute', () => {
    expect(() => runBumpDiff('relative/base.yaml', '/tmp/current.yaml')).toThrow(
      'basePath must be an absolute path'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when currentPath is not absolute', () => {
    expect(() => runBumpDiff('/tmp/base.yaml', 'relative/current.yaml')).toThrow(
      'currentPath must be an absolute path'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when basePath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p !== '/tmp/base.yaml');
    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'basePath does not exist'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when currentPath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p !== '/tmp/current.yaml');
    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'currentPath does not exist'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('returns parsed JSON when bump-cli outputs valid JSON', () => {
    const bumpOutput = JSON.stringify([
      { id: '1', name: 'GET /api/test', type: 'endpoint', status: 'added' },
    ]);
    mockExecFileSync.mockReturnValue(bumpOutput);

    const result = runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml');

    expect(result).toEqual([{ id: '1', name: 'GET /api/test', type: 'endpoint', status: 'added' }]);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'npm',
      [
        'run',
        '--silent',
        'bump:diff',
        '--',
        '/tmp/base.yaml',
        '/tmp/current.yaml',
        '--format=json',
      ],
      expect.objectContaining({
        encoding: 'utf-8',
        timeout: 240_000,
      })
    );
  });

  it('returns empty array for empty output', () => {
    mockExecFileSync.mockReturnValue('');
    expect(runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toEqual([]);
  });

  it('returns empty array for empty JSON array output', () => {
    mockExecFileSync.mockReturnValue('[]');
    expect(runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toEqual([]);
  });

  it('parses stdout from exit code 1 (breaking changes detected)', () => {
    const bumpOutput = JSON.stringify([
      { id: '1', name: 'DELETE /api/old', type: 'endpoint', status: 'removed', breaking: true },
    ]);

    const error = Object.assign(new Error('Process exited with code 1'), {
      stdout: bumpOutput,
      status: 1,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml');
    expect(result).toEqual([
      { id: '1', name: 'DELETE /api/old', type: 'endpoint', status: 'removed', breaking: true },
    ]);
  });

  it('throws BumpServiceError on exit code 1 with invalid stdout', () => {
    const error = Object.assign(new Error('Process exited with code 1'), {
      stdout: 'not json',
      status: 1,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(BumpServiceError);
    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      /no parseable JSON output/
    );
  });

  it('throws on non-1 exit codes', () => {
    const error = Object.assign(new Error('Process exited with code 2'), {
      stdout: '',
      status: 2,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'Process exited with code 2'
    );
  });

  it('throws BumpServiceError on empty stdout with exit code 1', () => {
    const error = Object.assign(new Error('Process exited with code 1'), {
      stdout: '',
      status: 1,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(BumpServiceError);
    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      /no parseable JSON output/
    );
  });

  it('throws BumpServiceError when bump.sh service is unavailable (stderr)', () => {
    const error = Object.assign(new Error('Command failed'), {
      stdout: '',
      stderr:
        'Error: We were unable to compute your documentation diff. Sorry about that. Please try again later.',
      status: 1,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(BumpServiceError);
    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      /bump\.sh service unavailable/
    );
  });

  it('throws BumpServiceError when bump.sh service error is in message', () => {
    const error = Object.assign(
      new Error(
        'We were unable to compute your documentation diff. Please contact support at https://bump.sh'
      ),
      {
        stdout: '',
        status: 2,
      }
    );
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(BumpServiceError);
  });

  it('does not throw BumpServiceError for unrelated errors', () => {
    const error = Object.assign(new Error('ENOBUFS'), {
      stdout: '',
      stderr: 'spawnSync /bin/sh ENOBUFS',
      status: null,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow('ENOBUFS');
    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).not.toThrow(BumpServiceError);
  });
});
