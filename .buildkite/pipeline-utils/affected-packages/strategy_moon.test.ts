/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('child_process');
jest.mock('fs');
jest.mock('../utils', () => ({ getKibanaDir: () => '/repo' }));
jest.mock('./strategy_git', () => ({ listChangedFiles: jest.fn(() => ['from/git/strategy.ts']) }));

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { listChangedFiles } from './strategy_git';
import { getAffectedProjectsMoon } from './strategy_moon';

const mockExecSync = execSync as jest.Mock;
const mockExistsSync = existsSync as jest.Mock;
const mockListChangedFiles = listChangedFiles as jest.Mock;

const moonResponse = JSON.stringify({ projects: [{ id: '@kbn/foo' }] });

beforeEach(() => {
  mockExistsSync.mockReturnValue(true);
  mockExecSync.mockReturnValue(moonResponse);
  mockListChangedFiles.mockReturnValue(['from/git/strategy.ts']);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('getAffectedProjectsMoon', () => {
  it('invokes the moon binary directly from node_modules/.bin (not via PATH)', () => {
    const result = getAffectedProjectsMoon('main', false, ['some/file.ts']);

    expect(result).toEqual(new Set(['@kbn/foo']));
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('/repo/node_modules/.bin/moon'),
      expect.anything()
    );
  });

  it('falls back to `yarn which moon` when node_modules/.bin/moon is missing', () => {
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValueOnce('/resolved/moon\n').mockReturnValueOnce(moonResponse);

    getAffectedProjectsMoon('main', false, ['some/file.ts']);

    expect(mockExecSync).toHaveBeenNthCalledWith(1, 'yarn --silent which moon', expect.anything());
    expect(mockExecSync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/resolved/moon'),
      expect.anything()
    );
  });

  it('requests deep dependents only when downstream traversal is asked for', () => {
    getAffectedProjectsMoon('main', true, ['some/file.ts']);
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('--downstream deep'),
      expect.anything()
    );

    mockExecSync.mockClear();

    getAffectedProjectsMoon('main', false, ['some/file.ts']);
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.not.stringContaining('--downstream'),
      expect.anything()
    );
  });

  it('pipes the given changed files on stdin and never falls back to MOON_BASE', () => {
    getAffectedProjectsMoon('main', true, ['a/one.ts', 'b/two.ts']);

    const [, options] = mockExecSync.mock.calls[0];
    expect(options.input).toEqual(JSON.stringify({ files: ['a/one.ts', 'b/two.ts'] }));
    expect(options.env?.MOON_BASE).toBeUndefined();
    expect(mockExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining('git merge-base'),
      expect.anything()
    );
  });

  it('sends an empty file list rather than letting moon scan local state', () => {
    const result = getAffectedProjectsMoon('main', true, []);

    const [, options] = mockExecSync.mock.calls[0];
    expect(options.input).toEqual(JSON.stringify({ files: [] }));
    expect(result).toEqual(new Set(['@kbn/foo']));
  });

  it('defaults to the git strategy changed-file list when none is given', () => {
    getAffectedProjectsMoon('some-possibly-stale-ref', true);

    expect(mockListChangedFiles).toHaveBeenCalledWith({
      mergeBase: 'some-possibly-stale-ref',
      commit: 'HEAD',
    });
    const [, options] = mockExecSync.mock.calls[0];
    expect(options.input).toEqual(JSON.stringify({ files: ['from/git/strategy.ts'] }));
  });
});
