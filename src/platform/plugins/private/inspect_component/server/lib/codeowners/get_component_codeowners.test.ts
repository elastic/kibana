/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getComponentCodeowners, clearCodeownersCache } from './get_component_codeowners';
import { REPO_ROOT } from '@kbn/repo-info';

jest.mock('fs');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('getComponentCodeowners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCodeownersCache();
    mockExistsSync.mockReturnValue(true);
  });

  it('should return empty array if CODEOWNERS file does not exist', () => {
    mockExistsSync.mockReturnValueOnce(false);

    const result = getComponentCodeowners('src/some/path');

    expect(mockExistsSync).toHaveBeenCalledWith(join(REPO_ROOT, '.github', 'CODEOWNERS'));
    expect(result).toEqual([]);
  });

  it('should return codeowners for exact path match', () => {
    mockReadFileSync.mockReturnValueOnce(`
      src/some/path @kibana-team1 @kibana-team2
      src/other/path @kibana-team3
    `);

    const result = getComponentCodeowners('src/some/path');

    expect(result).toEqual(['@kibana-team1', '@kibana-team2']);
  });

  it('should return codeowners for parent path if exact match not found', () => {
    mockReadFileSync.mockReturnValueOnce(`
      src/some @kibana-team1 @kibana-team2
      src/other/path @kibana-team3
    `);

    const result = getComponentCodeowners('src/some/path/file.ts');

    expect(result).toEqual(['@kibana-team1', '@kibana-team2']);
  });

  it('should find the most specific path match', () => {
    mockReadFileSync.mockReturnValueOnce(`
      src @kibana-team0
      src/some @kibana-team1
      src/some/path @kibana-team2 @kibana-team3
      src/some/path/deeper @kibana-team4
    `);

    const result = getComponentCodeowners('src/some/path/file.ts');

    expect(result).toEqual(['@kibana-team2', '@kibana-team3']);
  });

  it('should return empty array if no match found', () => {
    mockReadFileSync.mockReturnValueOnce(`
      src/other/path @kibana-team3
      src/another/path @kibana-team4
    `);

    const result = getComponentCodeowners('src/some/path');

    expect(result).toEqual([]);
  });
});
