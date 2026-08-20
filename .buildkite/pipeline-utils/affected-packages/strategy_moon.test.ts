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

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getAffectedProjectsMoon } from './strategy_moon';

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
      expect.objectContaining({ env: expect.objectContaining({ MOON_BASE: 'resolved-sha' }) })
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

  it('falls back to `yarn which moon` when node_modules/.bin/moon is missing', () => {
    mockExistsSync.mockReturnValue(false);
    mockExecSync
      .mockReturnValueOnce('resolved-sha\n') // git merge-base
      .mockReturnValueOnce('/resolved/moon\n') // yarn which moon
      .mockReturnValueOnce(moonResponse); // moon query

    getAffectedProjectsMoon('main', false);

    expect(mockExecSync).toHaveBeenNthCalledWith(2, 'yarn --silent which moon', expect.anything());
    expect(mockExecSync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/resolved/moon'),
      expect.anything()
    );
  });
});
