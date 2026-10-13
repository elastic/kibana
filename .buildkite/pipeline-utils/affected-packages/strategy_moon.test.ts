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
jest.mock('../utils.ts', () => ({ getKibanaDir: () => '/repo' }));

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getAffectedProjectsMoon, getDownstreamProjectsMoon } from './strategy_moon.ts';

const mockExecSync = execSync as jest.Mock;
const mockExistsSync = existsSync as jest.Mock;

const moonResponse = JSON.stringify({ projects: [{ id: '@kbn/foo' }] });

afterEach(() => {
  jest.clearAllMocks();
});

describe('getAffectedProjectsMoon', () => {
  it('invokes the moon binary directly from node_modules/.bin (not via PATH)', () => {
    mockExistsSync.mockReturnValue(true);
    mockExecSync
      .mockReturnValueOnce('resolved-sha\n') // git merge-base
      .mockReturnValueOnce(moonResponse); // moon query

    const result = getAffectedProjectsMoon('main', false);

    expect(result).toEqual(new Set(['@kbn/foo']));
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('/repo/node_modules/.bin/moon'),
      expect.objectContaining({
        env: expect.objectContaining({ MOON_BASE: 'resolved-sha', MOON_HEAD: 'HEAD' }),
      })
    );
  });

  it('recomputes the merge base locally instead of trusting the raw ref, mirroring the git strategy', () => {
    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockReturnValueOnce('resolved-sha\n').mockReturnValueOnce(moonResponse);

    getAffectedProjectsMoon('some-possibly-stale-ref', false);

    expect(mockExecSync).toHaveBeenNthCalledWith(
      1,
      'git merge-base some-possibly-stale-ref HEAD',
      expect.anything()
    );
    expect(mockExecSync).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ env: expect.objectContaining({ MOON_BASE: 'resolved-sha' }) })
    );
  });

  it('falls back to `pnpm exec which moon` when node_modules/.bin/moon is missing', () => {
    mockExistsSync.mockReturnValue(false);
    mockExecSync
      .mockReturnValueOnce('resolved-sha\n') // git merge-base
      .mockReturnValueOnce('/resolved/moon\n') // pnpm exec which moon
      .mockReturnValueOnce(moonResponse); // moon query

    getAffectedProjectsMoon('main', false);

    expect(mockExecSync).toHaveBeenNthCalledWith(
      2,
      'pnpm --silent exec which moon',
      expect.anything()
    );
    expect(mockExecSync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/resolved/moon'),
      expect.anything()
    );
  });
});

describe('getDownstreamProjectsMoon', () => {
  it('does not run moon for no files, which would make moon diff the working tree instead', () => {
    expect(getDownstreamProjectsMoon([])).toEqual(new Set());
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('passes the files on stdin instead of letting moon diff', () => {
    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockReturnValueOnce(moonResponse);

    const result = getDownstreamProjectsMoon(['packages/foo/kibana.jsonc']);

    expect(result).toEqual(new Set(['@kbn/foo']));
    const [command, options] = mockExecSync.mock.calls[0];
    expect(command).toContain('--affected --downstream deep');
    expect(JSON.parse(options.input)).toEqual({ files: ['packages/foo/kibana.jsonc'] });
  });
});
