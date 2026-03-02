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
import { runOasdiff } from './run_oasdiff';

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

const sampleEntry = {
  id: 'api-removed-without-deprecation',
  text: 'GET /api/test removed',
  level: 3,
  operation: 'GET',
  path: '/api/test',
  source: 'test',
};

describe('runOasdiff', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    delete process.env.OASDIFF_BIN;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when basePath is not absolute', () => {
    expect(() => runOasdiff('relative/base.yaml', '/tmp/current.yaml')).toThrow(
      'basePath must be an absolute path'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when currentPath is not absolute', () => {
    expect(() => runOasdiff('/tmp/base.yaml', 'relative/current.yaml')).toThrow(
      'currentPath must be an absolute path'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when basePath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p !== '/tmp/base.yaml');
    expect(() => runOasdiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'basePath does not exist'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when currentPath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p !== '/tmp/current.yaml');
    expect(() => runOasdiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'currentPath does not exist'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('returns parsed entries when oasdiff exits 0 with valid JSON', () => {
    mockExecFileSync.mockReturnValue(JSON.stringify([sampleEntry]));

    const result = runOasdiff('/tmp/base.yaml', '/tmp/current.yaml');

    expect(result).toEqual([sampleEntry]);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'oasdiff',
      ['breaking', '/tmp/base.yaml', '/tmp/current.yaml', '--format', 'json'],
      expect.objectContaining({ encoding: 'utf-8', timeout: 240_000 })
    );
  });

  it('returns empty array for empty output', () => {
    mockExecFileSync.mockReturnValue('');
    expect(runOasdiff('/tmp/base.yaml', '/tmp/current.yaml')).toEqual([]);
  });

  it('returns empty array for empty JSON array output', () => {
    mockExecFileSync.mockReturnValue('[]');
    expect(runOasdiff('/tmp/base.yaml', '/tmp/current.yaml')).toEqual([]);
  });

  it('parses stdout from exit code 1 (breaking changes detected)', () => {
    const error = Object.assign(new Error('Process exited with code 1'), {
      stdout: JSON.stringify([sampleEntry]),
      status: 1,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(runOasdiff('/tmp/base.yaml', '/tmp/current.yaml')).toEqual([sampleEntry]);
  });

  it('throws on exit code 2+', () => {
    const error = Object.assign(new Error('Process exited with code 2'), {
      stdout: '',
      status: 2,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runOasdiff('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'Process exited with code 2'
    );
  });

  it('uses OASDIFF_BIN env var when set', () => {
    process.env.OASDIFF_BIN = '/usr/local/bin/oasdiff';
    mockExecFileSync.mockReturnValue('[]');

    runOasdiff('/tmp/base.yaml', '/tmp/current.yaml');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/usr/local/bin/oasdiff',
      expect.any(Array),
      expect.any(Object)
    );
  });
});
