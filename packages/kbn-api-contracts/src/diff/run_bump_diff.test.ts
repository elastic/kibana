/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { runBumpDiff, BumpServiceError } from './run_bump_diff';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('runBumpDiff', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns parsed JSON when bump-cli outputs valid JSON', () => {
    const bumpOutput = JSON.stringify([
      { id: '1', name: 'GET /api/test', type: 'endpoint', status: 'added' },
    ]);
    mockExecSync.mockReturnValue(bumpOutput);

    const result = runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml');

    expect(result).toEqual([{ id: '1', name: 'GET /api/test', type: 'endpoint', status: 'added' }]);
    expect(mockExecSync).toHaveBeenCalledWith(
      'npx bump-cli diff "/tmp/base.yaml" "/tmp/current.yaml" --format=json',
      expect.objectContaining({
        encoding: 'utf-8',
        timeout: 240_000,
      })
    );
  });

  it('returns empty array for empty output', () => {
    mockExecSync.mockReturnValue('');
    expect(runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toEqual([]);
  });

  it('returns empty array for empty JSON array output', () => {
    mockExecSync.mockReturnValue('[]');
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
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    const result = runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml');
    expect(result).toEqual([
      { id: '1', name: 'DELETE /api/old', type: 'endpoint', status: 'removed', breaking: true },
    ]);
  });

  it('throws on exit code 1 with invalid stdout', () => {
    const error = Object.assign(new Error('Process exited with code 1'), {
      stdout: 'not json',
      status: 1,
    });
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow();
  });

  it('throws on non-1 exit codes', () => {
    const error = Object.assign(new Error('Process exited with code 2'), {
      stdout: '',
      status: 2,
    });
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'Process exited with code 2'
    );
  });

  it('throws on empty stdout with exit code 1', () => {
    const error = Object.assign(new Error('Process exited with code 1'), {
      stdout: '',
      status: 1,
    });
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow();
  });

  it('throws BumpServiceError when bump.sh service is unavailable (stderr)', () => {
    const error = Object.assign(new Error('Command failed'), {
      stdout: '',
      stderr:
        'Error: We were unable to compute your documentation diff. Sorry about that. Please try again later.',
      status: 1,
    });
    mockExecSync.mockImplementation(() => {
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
    mockExecSync.mockImplementation(() => {
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
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow('ENOBUFS');
    expect(() => runBumpDiff('/tmp/base.yaml', '/tmp/current.yaml')).not.toThrow(BumpServiceError);
  });
});
