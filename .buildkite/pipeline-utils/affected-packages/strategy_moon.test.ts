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
    mockExecSync.mockReturnValue(moonResponse);

    const result = getAffectedProjectsMoon('main', false);

    expect(result).toEqual(new Set(['@kbn/foo']));
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('/repo/node_modules/.bin/moon'),
      expect.objectContaining({ env: expect.objectContaining({ MOON_BASE: 'main' }) })
    );
  });

  it('falls back to `yarn which moon` when node_modules/.bin/moon is missing', () => {
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValueOnce('/resolved/moon\n').mockReturnValueOnce(moonResponse);

    getAffectedProjectsMoon('main', false);

    expect(mockExecSync).toHaveBeenNthCalledWith(1, 'yarn --silent which moon', expect.anything());
    expect(mockExecSync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/resolved/moon'),
      expect.anything()
    );
  });
});
