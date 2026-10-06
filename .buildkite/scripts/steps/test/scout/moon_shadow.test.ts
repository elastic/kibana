/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('#pipeline-utils', () => ({
  getAffectedProjectsMoon: jest.fn(),
}));

import type { ToolingLog } from '@kbn/tooling-log';
import { getAffectedProjectsMoon } from '#pipeline-utils';
import { computeMoonShadow } from './moon_shadow';

const mockGetAffectedProjectsMoon = getAffectedProjectsMoon as jest.Mock;

const createMockLog = (): ToolingLog =>
  ({ info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog);

afterEach(() => {
  jest.clearAllMocks();
});

describe('computeMoonShadow', () => {
  it('reports an empty diff when git and moon agree', () => {
    mockGetAffectedProjectsMoon.mockReturnValue(new Set(['@kbn/foo']));
    const log = createMockLog();

    const result = computeMoonShadow({
      mergeBase: 'main',
      gitChangedFiles: [],
      gitAffectedModules: new Set(['@kbn/foo']),
      log,
    });

    expect(result?.diffFromGit).toEqual({ onlyInGit: [], onlyInMoon: [] });
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('reports the diff and logs a warning when git and moon disagree', () => {
    mockGetAffectedProjectsMoon.mockReturnValue(new Set(['@kbn/moon-only']));
    const log = createMockLog();

    const result = computeMoonShadow({
      mergeBase: 'main',
      gitChangedFiles: [],
      gitAffectedModules: new Set(['@kbn/git-only']),
      log,
    });

    expect(result?.diffFromGit).toEqual({
      onlyInGit: ['@kbn/git-only'],
      onlyInMoon: ['@kbn/moon-only'],
    });
    expect(log.warning).toHaveBeenCalled();
  });

  it('returns null and logs a warning instead of throwing when moon fails', () => {
    mockGetAffectedProjectsMoon.mockImplementation(() => {
      throw new Error('moon binary not found');
    });
    const log = createMockLog();

    const result = computeMoonShadow({
      mergeBase: 'main',
      gitChangedFiles: [],
      gitAffectedModules: new Set(),
      log,
    });

    expect(result).toBeNull();
    expect(log.warning).toHaveBeenCalled();
  });

  it('overlays implicit consumers from the changed-files list', () => {
    mockGetAffectedProjectsMoon.mockReturnValue(new Set(['@kbn/ml-plugin']));

    const result = computeMoonShadow({
      mergeBase: 'main',
      gitChangedFiles: ['x-pack/plugins/ml/public/embeddables/register.ts'],
      gitAffectedModules: new Set(),
      log: createMockLog(),
    });

    expect(result?.affectedModules).toEqual(expect.arrayContaining(['@kbn/dashboard-plugin']));
  });
});
