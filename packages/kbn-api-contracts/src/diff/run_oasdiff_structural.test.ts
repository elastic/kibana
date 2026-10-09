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
import { runOasdiffStructural } from './run_oasdiff_structural';

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

const sampleDiff = {
  paths: {
    modified: {
      '/api/test': {
        operations: {
          modified: {
            POST: {
              requestBody: {
                content: {
                  modified: {
                    'application/json': {
                      schema: { additionalPropertiesAllowed: { from: null, to: false } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe('runOasdiffStructural', () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    delete process.env.OASDIFF_BIN;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when basePath is not absolute', () => {
    expect(() => runOasdiffStructural('relative/base.yaml', '/tmp/current.yaml')).toThrow(
      'basePath must be an absolute path'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when currentPath is not absolute', () => {
    expect(() => runOasdiffStructural('/tmp/base.yaml', 'relative/current.yaml')).toThrow(
      'currentPath must be an absolute path'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when basePath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p !== '/tmp/base.yaml');
    expect(() => runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'basePath does not exist'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws when currentPath does not exist', () => {
    mockExistsSync.mockImplementation((p) => p !== '/tmp/current.yaml');
    expect(() => runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'currentPath does not exist'
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('invokes oasdiff with diff/--format/json and returns parsed JSON', () => {
    mockExecFileSync.mockReturnValue(JSON.stringify(sampleDiff));

    const result = runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml');

    expect(result).toEqual(sampleDiff);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'oasdiff',
      ['diff', '/tmp/base.yaml', '/tmp/current.yaml', '--format', 'json'],
      expect.objectContaining({ encoding: 'utf-8', timeout: 240_000 })
    );
  });

  it('returns an empty object for empty stdout', () => {
    mockExecFileSync.mockReturnValue('');
    expect(runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml')).toEqual({});
  });

  it('parses stdout from exit code 1 (diff found)', () => {
    const error = Object.assign(new Error('Process exited with code 1'), {
      stdout: JSON.stringify(sampleDiff),
      status: 1,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml')).toEqual(sampleDiff);
  });

  it('throws on exit code 2+', () => {
    const error = Object.assign(new Error('Process exited with code 2'), {
      stdout: '',
      status: 2,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml')).toThrow(
      'Process exited with code 2'
    );
  });

  it('passes --match-path when matchPath option is provided', () => {
    mockExecFileSync.mockReturnValue('{}');

    runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml', {
      matchPath: '/api/actions/connector|/api/alerting/rule',
    });

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'oasdiff',
      [
        'diff',
        '/tmp/base.yaml',
        '/tmp/current.yaml',
        '--format',
        'json',
        '--match-path',
        '/api/actions/connector|/api/alerting/rule',
      ],
      expect.any(Object)
    );
  });

  it('does not pass --match-path when option is omitted', () => {
    mockExecFileSync.mockReturnValue('{}');

    runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'oasdiff',
      ['diff', '/tmp/base.yaml', '/tmp/current.yaml', '--format', 'json'],
      expect.any(Object)
    );
  });

  it('uses OASDIFF_BIN env var when set', () => {
    process.env.OASDIFF_BIN = '/usr/local/bin/oasdiff';
    mockExecFileSync.mockReturnValue('{}');

    runOasdiffStructural('/tmp/base.yaml', '/tmp/current.yaml');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/usr/local/bin/oasdiff',
      expect.any(Array),
      expect.any(Object)
    );
  });
});
